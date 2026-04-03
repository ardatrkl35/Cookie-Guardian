// ─────────────────────────────────────────────────────────────────────────────
// Cookie Guardian — Popup Script  v3.2
// Loads saved settings, binds UI, and persists changes via chrome.storage.sync
// Supports three preference modes: 'reject' | 'moderate' | 'accept'
// ─────────────────────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const els = {
  masterToggle:      $('#masterToggle'),
  themeToggle:       $('#themeToggle'),
  mainContent:       $('#mainContent'),
  disabledOverlay:   $('#disabledOverlay'),
  radios:            document.querySelectorAll('input[name="preference"]'),
  showNotifications: $('#showNotifications'),
  debugMode:         $('#debugMode'),
  firstVisitConfirm: $('#firstVisitConfirm'),
  toast:             $('#toast'),
  reportBtn:         $('#reportBtn'),
  // Whitelist
  whitelistToggleBtn: $('#whitelistToggleBtn'),
  whitelistLabel:     $('#whitelistToggleBtn .wl-action-label'),
  whitelistHost:      $('#whitelistHost'),
  wlToggleHeader:     $('#wlToggleHeader'),
  wlChevron:          $('#wlChevron'),
  wlPanel:            $('#wlPanel'),
  wlInput:            $('#wlInput'),
  wlAddBtn:           $('#wlAddBtn'),
  wlList:             $('#wlList'),
  wlEmpty:            $('#wlEmpty'),
};

// Human-readable labels for each preference mode
const PREF_LABELS = {
  reject:   'Reject All saved',
  moderate: 'Moderate Reject saved',
  accept:   'Accept All saved',
};

// ── Whitelist helpers ──────────────────────────────────────────────────────────
const WL_KEY_NORMAL  = 'cg_whitelisted_domains';
const WL_KEY_PRIVATE = 'cg_whitelisted_domains_private';
let activeWlKey      = WL_KEY_NORMAL;
let isPrivateContext = false;
let currentHostname  = null;

async function getWhitelist() {
  const result = await chrome.storage.local.get({ [activeWlKey]: [] });
  return result[activeWlKey];
}

async function setWhitelist(list) {
  await chrome.storage.local.set({ [activeWlKey]: list });
  chrome.runtime.sendMessage({ type: 'WHITELIST_UPDATED', incognito: isPrivateContext }).catch(() => {});
}

async function addToWhitelist(domain) {
  const list = await getWhitelist();
  const normalized = sanitizeDomain(domain);
  if (!normalized || list.includes(normalized)) return list;
  list.push(normalized);
  list.sort();
  await setWhitelist(list);
  return list;
}

async function removeFromWhitelist(domain) {
  let list = await getWhitelist();
  const normalized = sanitizeDomain(domain);
  list = list.filter(d => d !== normalized);
  await setWhitelist(list);
  return list;
}

function renderWhitelistPanel(list) {
  els.wlList.innerHTML = '';
  els.wlEmpty.style.display = list.length ? 'none' : 'block';

  for (const domain of list) {
    const li = document.createElement('li');
    li.className = 'wl-item';
    li.innerHTML = `
      <span class="wl-item-domain">${domain}</span>
      <button class="wl-remove-btn" data-domain="${domain}" title="Remove from whitelist">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
        </svg>
      </button>
    `;
    els.wlList.appendChild(li);
  }

  updateCurrentSiteButton(list);
}

function updateCurrentSiteButton(list) {
  if (!currentHostname) {
    els.whitelistToggleBtn.disabled = true;
    els.whitelistLabel.textContent = 'N/A';
    return;
  }

  const normalized = sanitizeDomain(currentHostname);
  const isWhitelisted = list.includes(normalized);
  els.whitelistToggleBtn.classList.toggle('is-whitelisted', isWhitelisted);
  els.whitelistLabel.textContent = isWhitelisted ? 'Remove' : 'Add';
}

function sanitizeDomain(input) {
  let d = input.toLowerCase().trim();
  try { d = new URL(d.includes('://') ? d : `https://${d}`).hostname; } catch (_) {}
  return d.replace(/^www\./, '');
}

// ── Load settings from storage and apply to UI ────────────────────────────────
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    preference:        'moderate',
    enabled:           true,
    showNotifications: true,
    debugMode:         false,
    firstVisitConfirm: false,
  });

  els.masterToggle.checked      = settings.enabled;
  els.showNotifications.checked = settings.showNotifications;
  els.debugMode.checked         = settings.debugMode;
  els.firstVisitConfirm.checked = settings.firstVisitConfirm;

  // Select the correct radio
  els.radios.forEach((r) => {
    r.checked = r.value === settings.preference;
  });

  // Reflect enabled/disabled state visually
  applyEnabledState(settings.enabled, false);
}

// ── Show / hide the disabled overlay ─────────────────────────────────────────
function applyEnabledState(enabled, animate = true) {
  if (animate) {
    els.disabledOverlay.style.transition = 'opacity 220ms ease';
  } else {
    els.disabledOverlay.style.transition = 'none';
  }
  els.disabledOverlay.classList.toggle('visible', !enabled);
}

function readSettingsFromUI() {
  return {
    preference:        [...els.radios].find((r) => r.checked)?.value ?? 'moderate',
    enabled:           els.masterToggle.checked,
    showNotifications: els.showNotifications.checked,
    debugMode:         els.debugMode.checked,
    firstVisitConfirm: els.firstVisitConfirm.checked,
  };
}

async function writeSettingsAndNotify(newSettings) {
  await chrome.storage.sync.set(newSettings);
  chrome.runtime.sendMessage({
    type:     'SETTINGS_UPDATED',
    settings: newSettings,
  }).catch(() => {});
}

function applyTheme(theme, animate = true) {
  if (!animate) {
    document.body.classList.add('theme-no-transition');
  }
  document.body.classList.toggle('dark-mode', theme === 'dark');
  if (!animate) {
    requestAnimationFrame(() => {
      document.body.classList.remove('theme-no-transition');
    });
  }
}

async function loadTheme() {
  const { theme = 'light' } = await chrome.storage.local.get({ theme: 'light' });
  applyTheme(theme, false);
  if (els.themeToggle) {
    els.themeToggle.checked = theme === 'dark';
  }
}

// ── Master toggle: immediate save (full snapshot so content script stays in sync) ─
els.masterToggle.addEventListener('change', async () => {
  applyEnabledState(els.masterToggle.checked);
  try {
    await writeSettingsAndNotify(readSettingsFromUI());
  } catch (err) {
    console.error('[CookieGuardian] Failed to save enabled state:', err);
  }
});

// ── Preference + options: auto-save on change (Save button removed — redundant) ─
let persistDebounce = null;

els.radios.forEach((radio) => {
  radio.addEventListener('change', () => {
    clearTimeout(persistDebounce);
    persistDebounce = setTimeout(async () => {
      try {
        const s = readSettingsFromUI();
        await writeSettingsAndNotify(s);
        showToast(PREF_LABELS[s.preference] ?? 'Settings saved!', 'success');
      } catch (err) {
        showToast('Save failed. Try again.', 'error');
        console.error('[CookieGuardian] Failed to save settings:', err);
      }
    }, 150);
  });
});

[els.showNotifications, els.debugMode, els.firstVisitConfirm].forEach((el) => {
  el.addEventListener('change', () => {
    clearTimeout(persistDebounce);
    persistDebounce = setTimeout(async () => {
      try {
        await writeSettingsAndNotify(readSettingsFromUI());
        showToast('Settings saved', 'success');
      } catch (err) {
        showToast('Save failed. Try again.', 'error');
        console.error('[CookieGuardian] Failed to save settings:', err);
      }
    }, 150);
  });
});

if (els.themeToggle) {
  els.themeToggle.addEventListener('change', async () => {
    const theme = els.themeToggle.checked ? 'dark' : 'light';
    applyTheme(theme);
    try {
      await chrome.storage.local.set({ theme });
    } catch (err) {
      console.error('[CookieGuardian] Failed to save theme:', err);
    }
  });
}

// ── Toast helper ──────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg, type = 'success') {
  const toast = els.toast;
  clearTimeout(toastTimer);

  toast.textContent = msg;
  toast.className   = `toast toast--below-pref toast--${type} toast--visible`;

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 2500);
}

// ── Footer link — open GitHub repo in a new tab ───────────────────────────────
document.querySelector('.footer-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: e.currentTarget.href });
});

// ── Report broken site ────────────────────────────────────────────────────────
// Rate limiting is enforced locally (chrome.storage.local) so one install
// can't flood GitHub with issues:
//   • Max 1 report per hostname per 24 hours
//   • Max 5 unique hostnames reported per 24-hour window
// GitHub issues require a GitHub account — that's the primary anti-spam gate.
// Only the hostname is included in the report, never the full URL (privacy).

const REPORT_DAY_MS    = 86_400_000;
const REPORT_DAILY_MAX = 5;

async function getCurrentHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    const url = new URL(tab.url);
    // Refuse to report browser-internal pages
    if (['chrome:', 'edge:', 'about:', 'chrome-extension:', 'moz-extension:'].includes(url.protocol)) {
      return null;
    }
    return url.hostname;
  } catch {
    return null;
  }
}

async function checkReportRateLimit(hostname) {
  const { reports = {} } = await chrome.storage.local.get('reports');
  const now = Date.now();

  // Prune entries older than 24 h
  const fresh = Object.fromEntries(
    Object.entries(reports).filter(([, ts]) => now - ts < REPORT_DAY_MS)
  );

  if (fresh[hostname]) {
    const hoursLeft = Math.ceil((REPORT_DAY_MS - (now - fresh[hostname])) / 3_600_000);
    return { allowed: false, reason: 'cooldown', hoursLeft, fresh };
  }

  if (Object.keys(fresh).length >= REPORT_DAILY_MAX) {
    return { allowed: false, reason: 'daily_limit', fresh };
  }

  return { allowed: true, fresh };
}

async function recordReport(hostname, fresh) {
  fresh[hostname] = Date.now();
  await chrome.storage.local.set({ reports: fresh });
}

function buildIssueUrl(hostname) {
  const title = `[Broken Site] ${hostname}`;
  const body  = [
    `**Site:** \`${hostname}\``,
    `**Extension version:** ${chrome.runtime.getManifest().version}`,
    '',
    '**What happened:**',
    '<!-- Describe what Cookie Guardian did wrong on this site -->',
    '',
    '**Expected behaviour:**',
    '<!-- What should have happened instead? -->',
    '',
    '**Browser / OS:**',
    '<!-- e.g. Chrome 124, Windows 11 -->',
    '',
    '---',
    '*Reported via the Cookie Guardian popup. Only the hostname was shared — no full URLs or personal data.*',
  ].join('\n');

  const params = new URLSearchParams({ title, body, labels: 'broken-site' });
  return `https://github.com/ardatrkl35/Cookie-Guardian/issues/new?${params}`;
}

els.reportBtn.addEventListener('click', async () => {
  const hostname = await getCurrentHostname();

  if (!hostname) {
    showToast('Cannot report browser pages.', 'error');
    return;
  }

  const { allowed, reason, hoursLeft, fresh } = await checkReportRateLimit(hostname);

  if (!allowed) {
    if (reason === 'cooldown') {
      showToast(`Already reported. Try again in ${hoursLeft}h.`, 'error');
    } else {
      showToast('Daily report limit reached (5/day).', 'error');
    }
    return;
  }

  await recordReport(hostname, fresh);
  chrome.tabs.create({ url: buildIssueUrl(hostname) });
  showToast('Opening GitHub — thanks!', 'success');
});

// ── Whitelist: toggle panel open/close ─────────────────────────────────────────
els.wlToggleHeader.addEventListener('click', () => {
  els.wlPanel.classList.toggle('open');
  els.wlChevron.classList.toggle('open');
});

// ── Whitelist: add/remove current site ────────────────────────────────────────
els.whitelistToggleBtn.addEventListener('click', async () => {
  if (!currentHostname) return;

  const normalized = sanitizeDomain(currentHostname);
  const list = await getWhitelist();
  const isWhitelisted = list.includes(normalized);
  let updated;

  if (isWhitelisted) {
    updated = await removeFromWhitelist(normalized);
    showToast(`${normalized} removed from whitelist`, 'error');
  } else {
    updated = await addToWhitelist(normalized);
    showToast(`${normalized} whitelisted`, 'success');
  }

  renderWhitelistPanel(updated);
});

// ── Whitelist: add from manual input ──────────────────────────────────────────
async function handleManualAdd() {
  const raw = els.wlInput.value;
  if (!raw.trim()) return;

  const domain = sanitizeDomain(raw);
  if (!domain) {
    showToast('Invalid domain', 'error');
    return;
  }

  const updated = await addToWhitelist(domain);
  els.wlInput.value = '';
  renderWhitelistPanel(updated);
  showToast(`${domain} whitelisted`, 'success');
}

els.wlAddBtn.addEventListener('click', handleManualAdd);
els.wlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleManualAdd();
});

// ── Whitelist: remove from list ───────────────────────────────────────────────
els.wlList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.wl-remove-btn');
  if (!btn) return;

  const domain = btn.dataset.domain;
  const updated = await removeFromWhitelist(domain);
  renderWhitelistPanel(updated);
  showToast(`${domain} removed`, 'error');
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function initWhitelist() {
  const win = await chrome.windows.getCurrent();
  isPrivateContext = win.incognito;
  activeWlKey = isPrivateContext ? WL_KEY_PRIVATE : WL_KEY_NORMAL;

  const badge = $('#wlContextBadge');
  if (badge) {
    if (isPrivateContext) {
      badge.hidden = false;
      badge.textContent = 'InPrivate';
      badge.classList.add('wl-badge--private');
    } else {
      badge.hidden = true;
      badge.classList.remove('wl-badge--private');
    }
  }

  currentHostname = await getCurrentHostname();
  els.whitelistHost.textContent = currentHostname || 'browser page';
  const list = await getWhitelist();
  renderWhitelistPanel(list);
}

loadTheme();
loadSettings();
initWhitelist();
