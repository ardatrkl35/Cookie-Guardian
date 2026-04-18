// ─────────────────────────────────────────────────────────────────────────────
// Cookie Guardian — Popup Script  v1.2.0 Beta
// Loads saved settings, binds UI, and persists changes via chrome.storage.sync
// Supports three preference modes: 'reject' | 'moderate' | 'accept'
//
// Note: Chrome does NOT substitute __MSG_*__ inside popup HTML — only manifest/CSS.
// All popup copy uses data-i18n* attributes + applyPopupStaticI18n() on load.
// ─────────────────────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

/** Human-readable extension version (manifest `version_name`, else `v` + `version`). */
function extensionDisplayVersion() {
  const m = chrome.runtime.getManifest();
  return m.version_name || `v${m.version}`;
}

/**
 * Apply messages to elements marked data-i18n, data-i18n-title, data-i18n-placeholder.
 * Must run before first paint logic; call immediately on script load.
 */
function applyPopupStaticI18n() {
  document.title = chrome.i18n.getMessage('extName');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = chrome.i18n.getMessage(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', chrome.i18n.getMessage(key));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', chrome.i18n.getMessage(key));
  });

  const dis = document.getElementById('disabledOverlayMsg');
  if (dis) {
    dis.textContent = chrome.i18n.getMessage('disabledOverlayFull');
  }
  const fv = document.getElementById('footerBrandVersion');
  if (fv) {
    fv.textContent = chrome.i18n.getMessage('footerVersionLabel', [extensionDisplayVersion()]);
  }
  try {
    const u = chrome.i18n.getUILanguage();
    if (u) document.documentElement.lang = u.split('-')[0];
  } catch (_) { /* ignore */ }
}

applyPopupStaticI18n();

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
  siteStatusIcon:    $('#siteStatusIcon'),
  siteStatusText:    $('#siteStatusText'),
  clearMetadataBtn:  $('#clearMetadataBtn'),
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
  // Always trusted + hints
  trustedToggleHeader: $('#trustedToggleHeader'),
  trustedChevron:      $('#trustedChevron'),
  trustedPanel:        $('#trustedPanel'),
  trustedList:         $('#trustedList'),
  trustedEmpty:        $('#trustedEmpty'),
  hintsToggleHeader:   $('#hintsToggleHeader'),
  hintsChevron:        $('#hintsChevron'),
  hintsPanel:          $('#hintsPanel'),
  hintsList:           $('#hintsList'),
  hintsEmpty:          $('#hintsEmpty'),
  hintsCount:          $('#hintsCount'),
};

function getPrefSavedToast(preference) {
  if (preference === 'reject') return chrome.i18n.getMessage('prefSavedReject');
  if (preference === 'moderate') return chrome.i18n.getMessage('prefSavedModerate');
  if (preference === 'accept') return chrome.i18n.getMessage('prefSavedAccept');
  return chrome.i18n.getMessage('toastSettingsSavedGeneric');
}

// ── Whitelist helpers ──────────────────────────────────────────────────────────
const WL_KEY_NORMAL  = 'cg_whitelisted_domains';
const WL_KEY_PRIVATE = 'cg_whitelisted_domains_private';
const TRUSTED_KEY    = 'cg_trusted_domains';
const HINTS_KEY      = 'cg_host_dismissal_hints';
const WL_MAX_ENTRIES = 500;
let activeWlKey      = WL_KEY_NORMAL;
let isPrivateContext = false;
let currentHostname  = null;
let reportInFlight   = false;
let whitelistWriteInFlight = false;

async function getWhitelist() {
  const result = await chrome.storage.local.get({ [activeWlKey]: [] });
  let raw = result[activeWlKey];
  if (!Array.isArray(raw)) raw = [];

  const normalized = raw.map((d) => normalizeHostname(String(d)));
  const hasInvalid = normalized.some((n) => n === null);
  const cleaned = [...new Set(normalized.filter(Boolean))].sort();
  const hadDupes = normalized.filter(Boolean).length !== cleaned.length;

  if (hasInvalid || hadDupes) {
    await chrome.storage.local.set({ [activeWlKey]: cleaned });
    chrome.runtime.sendMessage({ type: 'WHITELIST_UPDATED', incognito: isPrivateContext }).catch(() => {});
  }

  return cleaned;
}

async function setWhitelist(list) {
  await chrome.storage.local.set({ [activeWlKey]: list });
  chrome.runtime.sendMessage({ type: 'WHITELIST_UPDATED', incognito: isPrivateContext }).catch(() => {});
}

async function addToWhitelist(domain) {
  const list = await getWhitelist();
  const normalized = normalizeHostname(domain);
  if (!normalized) {
    showToast(chrome.i18n.getMessage('toastInvalidDomain'), 'error');
    return list;
  }
  if (list.length >= WL_MAX_ENTRIES) {
    showToast(chrome.i18n.getMessage('toastWhitelistFull', [String(WL_MAX_ENTRIES)]), 'error');
    return list;
  }
  if (list.includes(normalized)) return list;
  list.push(normalized);
  list.sort();
  await setWhitelist(list);
  return list;
}

async function removeFromWhitelist(domain) {
  let list = await getWhitelist();
  const normalized = normalizeHostname(domain);
  if (!normalized) return list;
  list = list.filter((d) => d !== normalized);
  await setWhitelist(list);
  return list;
}

async function guardedWhitelistWrite(operation) {
  if (whitelistWriteInFlight) return;
  whitelistWriteInFlight = true;
  try {
    await operation();
  } finally {
    whitelistWriteInFlight = false;
  }
}

function createWlRemoveIconSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '12');
  svg.setAttribute('height', '12');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z'
  );
  path.setAttribute('fill', 'currentColor');
  svg.appendChild(path);
  return svg;
}

function renderWhitelistPanel(list) {
  els.wlList.replaceChildren();
  els.wlEmpty.style.display = list.length ? 'none' : 'block';

  for (const domain of list) {
    const li = document.createElement('li');
    li.className = 'wl-item';

    const span = document.createElement('span');
    span.className = 'wl-item-domain';
    span.textContent = domain;

    const btn = document.createElement('button');
    btn.className = 'wl-remove-btn';
    btn.type = 'button';
    btn.setAttribute('title', chrome.i18n.getMessage('wlRemoveTitle'));
    btn.dataset.domain = domain;
    btn.appendChild(createWlRemoveIconSvg());

    li.appendChild(span);
    li.appendChild(btn);
    els.wlList.appendChild(li);
  }

  updateCurrentSiteButton(list);
}

function updateCurrentSiteButton(list) {
  if (!currentHostname) {
    els.whitelistToggleBtn.disabled = true;
    els.whitelistLabel.textContent = chrome.i18n.getMessage('labelNA');
    return;
  }

  const normalized = normalizeHostname(currentHostname);
  if (!normalized) {
    els.whitelistToggleBtn.disabled = true;
    els.whitelistLabel.textContent = chrome.i18n.getMessage('labelNA');
    return;
  }

  els.whitelistToggleBtn.disabled = false;
  const isWhitelisted = list.includes(normalized);
  els.whitelistToggleBtn.classList.toggle('is-whitelisted', isWhitelisted);
  els.whitelistLabel.textContent = isWhitelisted
    ? chrome.i18n.getMessage('labelWhitelistRemove')
    : chrome.i18n.getMessage('labelWhitelistAdd');
}

async function getTrustedDomainKeys() {
  const { [TRUSTED_KEY]: raw } = await chrome.storage.local.get({ [TRUSTED_KEY]: {} });
  const keys = [];
  if (Array.isArray(raw)) {
    for (const d of raw) {
      const n = normalizeHostname(String(d));
      if (n) keys.push(n);
    }
  } else if (raw && typeof raw === 'object') {
    for (const k of Object.keys(raw)) {
      const n = normalizeHostname(String(k));
      if (n) keys.push(n);
    }
  }
  return [...new Set(keys)].sort();
}

async function removeTrustedDomain(domain) {
  const n = normalizeHostname(String(domain));
  if (!n) return;
  const data = await chrome.storage.local.get({ [TRUSTED_KEY]: {} });
  const raw = data[TRUSTED_KEY];
  if (Array.isArray(raw)) {
    const next = raw.filter((d) => normalizeHostname(String(d)) !== n);
    await chrome.storage.local.set({ [TRUSTED_KEY]: next });
    return;
  }
  if (raw && typeof raw === 'object') {
    const next = { ...raw };
    for (const k of Object.keys(raw)) {
      if (normalizeHostname(String(k)) === n) delete next[k];
    }
    await chrome.storage.local.set({ [TRUSTED_KEY]: next });
  }
}

async function renderTrustedPanel() {
  const entries = await getTrustedDomainKeys();
  els.trustedList.replaceChildren();
  els.trustedEmpty.style.display = entries.length ? 'none' : 'block';

  for (const domain of entries) {
    const li = document.createElement('li');
    li.className = 'wl-item';

    const span = document.createElement('span');
    span.className = 'wl-item-domain';
    span.textContent = domain;

    const btn = document.createElement('button');
    btn.className = 'wl-remove-btn trusted-remove-btn';
    btn.type = 'button';
    btn.setAttribute('title', chrome.i18n.getMessage('trustedRemoveTitle'));
    btn.dataset.domain = domain;
    btn.appendChild(createWlRemoveIconSvg());

    li.appendChild(span);
    li.appendChild(btn);
    els.trustedList.appendChild(li);
  }
}

async function renderHintsPanel() {
  const { [HINTS_KEY]: raw } = await chrome.storage.local.get({ [HINTS_KEY]: {} });
  const map = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const keys = Object.keys(map)
    .map((k) => normalizeHostname(String(k)) || String(k))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  els.hintsCount.textContent = String(keys.length);
  els.hintsList.replaceChildren();
  els.hintsEmpty.style.display = keys.length ? 'none' : 'block';

  for (const host of keys) {
    const li = document.createElement('li');
    li.className = 'wl-item hints-item';

    const span = document.createElement('span');
    span.className = 'wl-item-domain';
    span.textContent = host;

    li.appendChild(span);
    els.hintsList.appendChild(li);
  }
}

async function updateSiteStatus() {
  const iconEl = els.siteStatusIcon;
  const textEl = els.siteStatusText;
  if (!iconEl || !textEl) return;

  const host = currentHostname && normalizeHostname(currentHostname);
  if (!host) {
    iconEl.textContent = '⚠️';
    textEl.textContent = chrome.i18n.getMessage('siteStatusUnavailable');
    return;
  }

  const settings = await chrome.storage.sync.get({
    enabled: true,
  });

  if (!settings.enabled) {
    iconEl.textContent = '🔴';
    textEl.textContent = chrome.i18n.getMessage('siteStatusDisabled');
    return;
  }

  const list = await getWhitelist();
  if (list.includes(host)) {
    iconEl.textContent = '⏸️';
    textEl.textContent = chrome.i18n.getMessage('siteStatusWhitelisted');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    iconEl.textContent = '⚠️';
    textEl.textContent = chrome.i18n.getMessage('siteStatusNoTab');
    return;
  }

  const live = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_POPUP_SITE_STATUS' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });

  if (!live || !live.ok) {
    iconEl.textContent = '🔍';
    textEl.textContent = chrome.i18n.getMessage('siteStatusPageUnavailable');
    return;
  }

  if (live.firstVisitToastVisible) {
    iconEl.textContent = '⏳';
    textEl.textContent = chrome.i18n.getMessage('siteStatusAwaitingConfirm');
    return;
  }

  if (live.handled) {
    iconEl.textContent = '✅';
    textEl.textContent = chrome.i18n.getMessage('siteStatusBannerHandled');
    return;
  }

  if (live.retryExhausted) {
    iconEl.textContent = '🔍';
    textEl.textContent = chrome.i18n.getMessage('siteStatusNoBanner');
    return;
  }

  iconEl.textContent = '🔍';
  textEl.textContent = chrome.i18n.getMessage('siteStatusWatching');
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

let settingsWriteInFlight = false;
let pendingSettings = null;

async function writeSettingsAndNotifyGuarded(newSettings) {
  if (settingsWriteInFlight) {
    pendingSettings = newSettings;
    return;
  }
  settingsWriteInFlight = true;
  try {
    let payload = newSettings;
    for (;;) {
      await writeSettingsAndNotify(payload);
      if (!pendingSettings) break;
      payload = pendingSettings;
      pendingSettings = null;
    }
  } finally {
    settingsWriteInFlight = false;
  }
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
    await writeSettingsAndNotifyGuarded(readSettingsFromUI());
    await updateSiteStatus();
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
        await writeSettingsAndNotifyGuarded(s);
        showToast(getPrefSavedToast(s.preference), 'success');
      } catch (err) {
        showToast(chrome.i18n.getMessage('toastSaveFailed'), 'error');
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
        await writeSettingsAndNotifyGuarded(readSettingsFromUI());
        showToast(chrome.i18n.getMessage('toastSettingsSaved'), 'success');
      } catch (err) {
        showToast(chrome.i18n.getMessage('toastSaveFailed'), 'error');
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

function hideToastNow() {
  clearTimeout(toastTimer);
  toastTimer = null;
  els.toast.classList.remove('toast--visible', 'toast--with-undo');
  els.toast.replaceChildren();
}

function showToast(msg, type = 'success') {
  const toast = els.toast;
  hideToastNow();

  toast.appendChild(document.createTextNode(msg));
  toast.className = `toast toast--below-pref toast--${type} toast--visible`;

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
    toast.replaceChildren();
  }, 2500);
}

function showUndoToast(domain) {
  hideToastNow();

  const msg = document.createElement('span');
  msg.className = 'toast-message';
  msg.textContent = chrome.i18n.getMessage('toastWhitelisted', [domain]);

  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.className = 'toast-undo-btn';
  undoBtn.textContent = chrome.i18n.getMessage('toastUndoButton');

  undoBtn.addEventListener('click', async () => {
    hideToastNow();
    try {
      const updated = await removeFromWhitelist(domain);
      renderWhitelistPanel(updated);
      await updateSiteStatus();
    } catch (err) {
      console.error('[CookieGuardian] Undo whitelist failed:', err);
      showToast(chrome.i18n.getMessage('toastUndoFailed'), 'error');
    }
  });

  els.toast.appendChild(msg);
  els.toast.appendChild(undoBtn);
  els.toast.className = 'toast toast--below-pref toast--success toast--visible toast--with-undo';

  toastTimer = setTimeout(() => {
    hideToastNow();
  }, 5000);
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
const REPORT_MAX_ENTRIES = 100;
const REPORT_TTL_MS      = 7 * 24 * 60 * 60 * 1000;

function reportEntryTs(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value && typeof value.ts === 'number') return value.ts;
  return 0;
}

function pruneStorageMap(map, maxEntries, ttlMs) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) return map;
  const now = Date.now();
  for (const [key, value] of Object.entries(map)) {
    const ts = reportEntryTs(value);
    if (ttlMs !== Infinity && ts > 0 && (now - ts) > ttlMs) {
      delete map[key];
    }
  }
  const entries = Object.entries(map);
  if (entries.length > maxEntries) {
    entries.sort((a, b) => reportEntryTs(a[1]) - reportEntryTs(b[1]));
    const toRemove = entries.length - maxEntries;
    for (let i = 0; i < toRemove; i++) {
      delete map[entries[i][0]];
    }
  }
  return map;
}

async function getCurrentHostname() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    const url = new URL(tab.url);
    // Refuse to report browser-internal pages
    if (['chrome:', 'edge:', 'about:', 'chrome-extension:', 'moz-extension:'].includes(url.protocol)) {
      return null;
    }
    return normalizeHostname(url.hostname);
  } catch {
    return null;
  }
}

async function checkReportRateLimit(hostname) {
  const { reports = {} } = await chrome.storage.local.get('reports');
  const reportsMap = { ...reports };
  pruneStorageMap(reportsMap, REPORT_MAX_ENTRIES, REPORT_TTL_MS);
  if (JSON.stringify(reportsMap) !== JSON.stringify(reports)) {
    await chrome.storage.local.set({ reports: reportsMap });
  }

  const now = Date.now();

  // Rate-limit window: entries newer than 24 h (values may be legacy numbers or { ts }).
  const fresh = Object.fromEntries(
    Object.entries(reportsMap).filter(([, v]) => now - reportEntryTs(v) < REPORT_DAY_MS)
  );

  const hostTs = reportEntryTs(fresh[hostname]);
  if (hostTs > 0) {
    const hoursLeft = Math.ceil((REPORT_DAY_MS - (now - hostTs)) / 3_600_000);
    return { allowed: false, reason: 'cooldown', hoursLeft, reportsMap };
  }

  if (Object.keys(fresh).length >= REPORT_DAILY_MAX) {
    return { allowed: false, reason: 'daily_limit', reportsMap };
  }

  return { allowed: true, reportsMap };
}

async function recordReport(hostname, reportsMap) {
  reportsMap[hostname] = { ts: Date.now() };
  pruneStorageMap(reportsMap, REPORT_MAX_ENTRIES, REPORT_TTL_MS);
  await chrome.storage.local.set({ reports: reportsMap });
}

function buildIssueUrl(hostname) {
  const title = chrome.i18n.getMessage('reportIssueTitle', [hostname]);
  const body  = chrome.i18n.getMessage('reportIssueBody', [
    hostname,
    extensionDisplayVersion(),
  ]);

  const params = new URLSearchParams({ title, body, labels: 'broken-site' });
  return `https://github.com/ardatrkl35/Cookie-Guardian/issues/new?${params}`;
}

els.reportBtn.addEventListener('click', async () => {
  if (reportInFlight) return;
  reportInFlight = true;
  els.reportBtn.disabled = true;
  els.reportBtn.classList.add('loading');

  try {
    const hostname = await getCurrentHostname();

    if (!hostname) {
      showToast(chrome.i18n.getMessage('toastCannotReportBrowser'), 'error');
      return;
    }

    const { allowed, reason, hoursLeft, reportsMap } = await checkReportRateLimit(hostname);

    if (!allowed) {
      if (reason === 'cooldown') {
        showToast(chrome.i18n.getMessage('toastReportCooldown', [String(hoursLeft)]), 'error');
      } else {
        showToast(chrome.i18n.getMessage('toastReportDailyLimit'), 'error');
      }
      return;
    }

    await recordReport(hostname, reportsMap);
    chrome.tabs.create({ url: buildIssueUrl(hostname) });
    showToast(chrome.i18n.getMessage('toastOpeningGithub'), 'success');
  } catch (err) {
    showToast(chrome.i18n.getMessage('toastReportFailed'), 'error');
    console.error('[CG] Report error:', err);
  } finally {
    reportInFlight = false;
    els.reportBtn.disabled = false;
    els.reportBtn.classList.remove('loading');
  }
});

// ── Whitelist: toggle panel open/close ─────────────────────────────────────────
els.wlToggleHeader.addEventListener('click', () => {
  const wasExpanded = els.wlToggleHeader.getAttribute('aria-expanded') === 'true';
  const isExpanded = !wasExpanded;
  els.wlPanel.classList.toggle('open', isExpanded);
  els.wlChevron.classList.toggle('open', isExpanded);
  els.wlToggleHeader.setAttribute('aria-expanded', String(isExpanded));
});

els.trustedToggleHeader.addEventListener('click', () => {
  const wasExpanded = els.trustedToggleHeader.getAttribute('aria-expanded') === 'true';
  const isExpanded = !wasExpanded;
  els.trustedPanel.classList.toggle('open', isExpanded);
  els.trustedChevron.classList.toggle('open', isExpanded);
  els.trustedToggleHeader.setAttribute('aria-expanded', String(isExpanded));
});

els.hintsToggleHeader.addEventListener('click', () => {
  const wasExpanded = els.hintsToggleHeader.getAttribute('aria-expanded') === 'true';
  const isExpanded = !wasExpanded;
  els.hintsPanel.classList.toggle('open', isExpanded);
  els.hintsChevron.classList.toggle('open', isExpanded);
  els.hintsToggleHeader.setAttribute('aria-expanded', String(isExpanded));
});

els.clearMetadataBtn.addEventListener('click', async () => {
  if (!confirm(chrome.i18n.getMessage('confirmClearLocalData'))) return;
  try {
    await chrome.storage.local.remove([HINTS_KEY, TRUSTED_KEY, 'reports']);
    showToast(chrome.i18n.getMessage('toastLocalDataCleared'), 'success');
    await renderTrustedPanel();
    await renderHintsPanel();
    await updateSiteStatus();
  } catch (err) {
    console.error('[CookieGuardian] Clear local data failed:', err);
    showToast(chrome.i18n.getMessage('toastClearFailed'), 'error');
  }
});

// ── Whitelist: add/remove current site ────────────────────────────────────────
els.whitelistToggleBtn.addEventListener('click', async () => {
  await guardedWhitelistWrite(async () => {
    if (!currentHostname) return;

    const normalized = normalizeHostname(currentHostname);
    if (!normalized) {
      showToast(chrome.i18n.getMessage('toastCannotWhitelistAddress'), 'error');
      return;
    }

    const list = await getWhitelist();
    const isWhitelisted = list.includes(normalized);
    let updated;

    if (isWhitelisted) {
      updated = await removeFromWhitelist(normalized);
      showToast(chrome.i18n.getMessage('toastRemovedFromWhitelist', [normalized]), 'error');
    } else {
      const beforeLen = list.length;
      updated = await addToWhitelist(normalized);
      if (updated.length > beforeLen) {
        showUndoToast(normalized);
      }
    }

    renderWhitelistPanel(updated);
    await updateSiteStatus();
  });
});

// ── Whitelist: add from manual input ──────────────────────────────────────────
async function handleManualAdd() {
  await guardedWhitelistWrite(async () => {
    const raw = els.wlInput.value;
    if (!raw.trim()) return;

    const preview = normalizeHostname(raw);
    if (!preview) {
      showToast(chrome.i18n.getMessage('toastInvalidDomain'), 'error');
      return;
    }

    const listBefore = await getWhitelist();
    const updated = await addToWhitelist(raw);
    const added = updated.length > listBefore.length;

    els.wlInput.value = '';
    renderWhitelistPanel(updated);

    if (added) {
      showUndoToast(preview);
    } else if (listBefore.includes(preview)) {
      showToast(chrome.i18n.getMessage('toastAlreadyWhitelisted'), 'error');
    }
    await updateSiteStatus();
  });
}

els.wlAddBtn.addEventListener('click', handleManualAdd);
els.wlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleManualAdd();
});

// ── Whitelist: remove from list ───────────────────────────────────────────────
els.wlList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.wl-remove-btn');
  if (!btn) return;

  await guardedWhitelistWrite(async () => {
    const domain = btn.dataset.domain;
    const updated = await removeFromWhitelist(domain);
    renderWhitelistPanel(updated);
    showToast(chrome.i18n.getMessage('toastDomainRemoved', [domain]), 'error');
    await updateSiteStatus();
  });
});

els.trustedList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.trusted-remove-btn');
  if (!btn) return;
  const domain = btn.dataset.domain;
  await removeTrustedDomain(domain);
  await renderTrustedPanel();
  showToast(chrome.i18n.getMessage('toastRemovedFromTrusted', [domain]), 'success');
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
      badge.textContent = chrome.i18n.getMessage('contextInPrivate');
      badge.classList.add('wl-badge--private');
    } else {
      badge.hidden = true;
      badge.classList.remove('wl-badge--private');
    }
  }

  currentHostname = await getCurrentHostname();
  els.whitelistHost.textContent = currentHostname || chrome.i18n.getMessage('placeholderBrowserPage');
  const list = await getWhitelist();
  renderWhitelistPanel(list);
  await renderTrustedPanel();
  await renderHintsPanel();
  await updateSiteStatus();
}

loadTheme();
loadSettings();
initWhitelist();
