importScripts('../shared/hostname.js');
// =============================================================================
// Cookie Guardian — Background Service Worker  v1.2.0 Beta
// Handles installation defaults and message routing from the popup.
//
// FIX NOTES (v3.1):
//   • Removed "type":"module" from manifest — not needed, was crashing Edge
//   • Replaced .catch() Promise chain inside callback with async/await + try/catch
//     (mixing callback-style chrome.tabs.query with .catch() on sendMessage
//      caused a silent TypeError that brought down the whole worker)
//   • Updated DEFAULT_SETTINGS.preference to 'moderate' to match popup/content
//   • All chrome.* calls that return Promises are now awaited inside try/catch
// =============================================================================

const DEFAULT_SETTINGS = {
  preference:        'moderate', // 'reject' | 'moderate' | 'accept'
  enabled:           true,       // master on/off toggle
  showNotifications: true,       // flash badge when banner is handled
  debugMode:         false,      // verbose logs to DevTools console
  firstVisitConfirm: false,      // ask user before auto-clicking on unknown sites
};

// ── On install: write defaults if nothing is stored yet ──────────────────────
chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install') return;

  chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS), function (existing) {
    // Spread order: DEFAULT_SETTINGS first so existing user values win
    const merged = Object.assign({}, DEFAULT_SETTINGS, existing);
    chrome.storage.sync.set(merged, function () {
      console.log('[CookieGuardian] Installed. Default settings written:', merged);
    });
  });
});

// ── Helper: safely send a message to one tab (never throws) ──────────────────
async function sendToTab(tabId, payload) {
  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch (_e) {
    // Restricted URL, no receiver, tab closed, or other runtime error — ignore
  }
}

// ── Helper: load base icon as ImageBitmap (cached per service-worker lifetime) ─
var _baseBitmapPromise = null;
function getBaseBitmap() {
  if (!_baseBitmapPromise) {
    _baseBitmapPromise = fetch(chrome.runtime.getURL('icons/icon128.png'))
      .then(function (res) { return res.blob(); })
      .then(function (blob) { return createImageBitmap(blob); });
  }
  return _baseBitmapPromise;
}

// ── Toolbar badge fallback when OffscreenCanvas / setIcon path fails (JOB_19) ─
const BADGE_STATES = {
  handled: { text: '✓', color: '#4CAF50' },
  active:  { text: '·', color: '#2196F3' },
  error:   { text: '!', color: '#f44336' },
  off:     { text: '', color: '#9E9E9E' },
};

async function applyIconBadgeFallback(tabId, state) {
  const cfg = BADGE_STATES[state] || BADGE_STATES.off;
  try {
    await chrome.action.setBadgeText({ tabId, text: cfg.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: cfg.color });
  } catch (e) {
    console.warn('[CookieGuardian] Badge fallback chrome.action failed:', e);
  }
}

// ── Helper: draw base icon with ✅ overlay, revert after 2 s ──────────────────
function drawOverlayIcon(tabId, state) {
  if (state === undefined || state === null) {
    state = 'handled';
  }
  var SIZE = 128;

  if (typeof OffscreenCanvas === 'undefined') {
    void applyIconBadgeFallback(tabId, state);
    return;
  }

  getBaseBitmap().then(function (bitmap) {
    try {
      var canvas = new OffscreenCanvas(SIZE, SIZE);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.font = '110px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2705', SIZE / 2, SIZE / 2 + 4);

      var overlayData = ctx.getImageData(0, 0, SIZE, SIZE);

      chrome.action.setBadgeText({ tabId, text: '' }).catch(function () {});

      chrome.action.setIcon({ imageData: overlayData, tabId: tabId }).then(function () {
        setTimeout(function () {
          try {
            var revertCanvas = new OffscreenCanvas(SIZE, SIZE);
            var rctx = revertCanvas.getContext('2d');
            rctx.drawImage(bitmap, 0, 0, SIZE, SIZE);
            var baseData = rctx.getImageData(0, 0, SIZE, SIZE);

            chrome.action.setIcon({ imageData: baseData, tabId: tabId }).catch(function () {});
          } catch (revertErr) {
            console.warn('[CookieGuardian] Icon revert canvas failed:', revertErr);
            void applyIconBadgeFallback(tabId, 'off');
          }
        }, 2000);
      }).catch(function (e) {
        console.warn('[CookieGuardian] setIcon overlay failed:', e);
        void applyIconBadgeFallback(tabId, state);
      });
    } catch (err) {
      console.warn('[CookieGuardian] Icon canvas path failed, using badge fallback:', err);
      void applyIconBadgeFallback(tabId, state);
    }
  }).catch(function (e) {
    console.warn('[CookieGuardian] drawOverlayIcon failed:', e);
    void applyIconBadgeFallback(tabId, state);
  });
}

// ── Auto-cleanup: remove InPrivate whitelist when last incognito window closes ─
chrome.windows.onRemoved.addListener(function () {
  chrome.windows.getAll(function (windows) {
    var hasIncognito = windows.some(function (w) { return w.incognito; });
    if (!hasIncognito) {
      chrome.storage.local.remove('cg_whitelisted_domains_private');
    }
  });
});

// ── Message bridge: popup → content scripts ───────────────────────────────────
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

  // ── GET_TAB_CONTEXT: tell content script if its tab is incognito ───────────
  if (message.type === 'GET_TAB_CONTEXT') {
    var incognito = sender && sender.tab ? sender.tab.incognito : false;
    sendResponse({ incognito: incognito });
    return false;
  }

  // ── SETTINGS_UPDATED: relay new settings to all active normal tabs ─────────
  if (message.type === 'SETTINGS_UPDATED') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs) return;
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (
          tab.id &&
          tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('edge://') &&
          !tab.url.startsWith('about:')
        ) {
          void sendToTab(tab.id, {
            type:     'SETTINGS_UPDATED',
            settings: message.settings,
          });
        }
      }
    });

    sendResponse({ ok: true });
    return true; // keep channel open
  }

  // ── WHITELIST_UPDATED: relay only to tabs in the same context ───────────────
  if (message.type === 'WHITELIST_UPDATED') {
    var targetIncognito = !!message.incognito;
    chrome.tabs.query({}, function (tabs) {
      if (!tabs) return;
      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        if (
          tab.id &&
          tab.url &&
          tab.incognito === targetIncognito &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('edge://') &&
          !tab.url.startsWith('about:')
        ) {
          void sendToTab(tab.id, { type: 'WHITELIST_UPDATED' });
        }
      }
    });

    sendResponse({ ok: true });
    return true;
  }

  // ── BANNER_HANDLED: overlay ✅ on the icon for the originating tab ─────────
  if (message.type === 'BANNER_HANDLED') {
    var tabId = sender && sender.tab ? sender.tab.id : null;

    if (tabId) {
      chrome.storage.sync.get({ showNotifications: true }, function (prefs) {
        if (prefs.showNotifications) {
          drawOverlayIcon(tabId);
        }
      });
    }

    sendResponse({ ok: true });
    return true;
  }

  // Unknown message type — respond so channel doesn't hang
  sendResponse({ ok: false, reason: 'unknown message type' });
  return false;
});
