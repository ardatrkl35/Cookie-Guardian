// ─────────────────────────────────────────────────────────────────────────────
// Cookie Guardian — Popup Script  v3.1
// Loads saved settings, binds UI, and persists changes via chrome.storage.sync
// Supports three preference modes: 'reject' | 'moderate' | 'accept'
// ─────────────────────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);

const els = {
  masterToggle:      $('#masterToggle'),
  mainContent:       $('#mainContent'),
  disabledOverlay:   $('#disabledOverlay'),
  radios:            document.querySelectorAll('input[name="preference"]'),
  showNotifications: $('#showNotifications'),
  debugMode:         $('#debugMode'),
  firstVisitConfirm: $('#firstVisitConfirm'),
  saveBtn:           $('#saveBtn'),
  saveBtnText:       $('#saveBtn .save-btn-text'),
  toast:             $('#toast'),
};

// Human-readable labels for each preference mode
const PREF_LABELS = {
  reject:   'Reject All saved',
  moderate: 'Moderate Reject saved',
  accept:   'Accept All saved',
};

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

// ── Master toggle: instant visual feedback, no save required ─────────────────
els.masterToggle.addEventListener('change', () => {
  applyEnabledState(els.masterToggle.checked);
});

// ── Save button ───────────────────────────────────────────────────────────────
els.saveBtn.addEventListener('click', async () => {
  const selectedPref = [...els.radios].find((r) => r.checked)?.value ?? 'moderate';

  const newSettings = {
    preference:        selectedPref,
    enabled:           els.masterToggle.checked,
    showNotifications: els.showNotifications.checked,
    debugMode:         els.debugMode.checked,
    firstVisitConfirm: els.firstVisitConfirm.checked,
  };

  try {
    await chrome.storage.sync.set(newSettings);

    // Notify content scripts in active tab
    chrome.runtime.sendMessage({
      type:     'SETTINGS_UPDATED',
      settings: newSettings,
    }).catch(() => {}); // background might not be awake — safe to ignore

    showToast(PREF_LABELS[selectedPref] ?? 'Settings saved!', 'success');
  } catch (err) {
    showToast('Save failed. Try again.', 'error');
    console.error('[CookieGuardian] Failed to save settings:', err);
  }
});

// ── Toast helper ──────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg, type = 'success') {
  const toast = els.toast;
  clearTimeout(toastTimer);

  toast.textContent = msg;
  toast.className   = `toast toast--${type} toast--visible`;

  toastTimer = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 2500);
}

// ── Footer link — open GitHub repo in a new tab ───────────────────────────────
document.querySelector('.footer-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: e.currentTarget.href });
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadSettings();
