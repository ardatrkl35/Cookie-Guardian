// =============================================================================
//  Cookie Guardian — Content Script  v1.1.1  (Enterprise Edition)
//  Manifest V3 · Microsoft Edge / Chrome
//
//  Sources:
//    • 24-entry CMP dataset (Çerez_Araçları_DOM_Seçicileri_Veri_Seti.xlsx)
//    • Amazon / IMDB / Prime Video cookie services  (sp-cc infrastructure)
//    • EU Official Websites Cookie Consent Kit      (europa.eu / ec.europa.eu)
//    • German Federal Government sites              (bundesregierung.de / bund.de)
//    • efl-button custom element support
//    • Deep recursive Shadow DOM piercing
//    • Persistent, shadow-aware MutationObserver
//    • Multi-language text heuristics (21 languages)
//
//  Table of Contents
//  ─────────────────
//  §1   Runtime state & constants
//  §2   CMP dictionary  (dataset + extended)
//  §3   Multilingual text-pattern banks
//  §4   Shadow DOM piercing engine
//  §5   Universal DOM query helpers
//  §6   Element visibility & safe-click helpers
//  §7   Custom element support  (efl-button & friends)
//  §8   Multilingual heuristic scorer  (score + XPath)
//  §9   Iframe scanning helper
//  §10  CMP-profile handler  (selector → click)
//  §11  Generic heuristic handler
//  §12  Main orchestrator  (attemptHandle)
//  §13  Persistent MutationObserver  (shadow-aware, self-reattaching)
//  §14  Polling fallback
//  §15  Settings sync & initialisation
// =============================================================================

/* global chrome, XPathResult */

(function cookieGuardian() {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════════
  // §1  Runtime state & constants
  // ══════════════════════════════════════════════════════════════════════════

  let settings = {
    preference:        'moderate',  // 'reject' | 'moderate' | 'accept'
    enabled:           true,
    showNotifications: true,
    debugMode:         false,
  };

  let handled        = false;
  let pollingTimer   = null;
  let retryCount     = 0;
  let debounceTimer  = null;

  // Per-host dismissal hints — chrome.storage.local; one fast-path try per page load
  const HOST_HINTS_KEY        = 'cg_host_dismissal_hints';
  let   hostHints             = {};
  let   hostHintsLoaded       = false;
  let   hostHintFastPathTried = false;

  // ── Moderate-reject state ──────────────────────────────────────────────────
  // Counts how many full detection passes were run while seeking a reject
  // button in 'moderate' mode.  Once this reaches MODERATE_REJECT_TRIES the
  // mode silently falls back to accepting to clear the banner.
  let moderateRejectAttempts = 0;
  const MODERATE_REJECT_TRIES = 8;   // 8 × 500 ms polling = 4 s of reject-seeking
  // Set to true once the moderate fallback fires, so we log it clearly.
  let moderateFallingBack = false;

  const MAX_RETRY    = 80;    // 80 × 500 ms = 40 s window (covers very slow loaders)
  const DEBOUNCE_MS  = 200;

  // Track which shadow roots we already observe (avoid duplicate observers)
  const observedShadowRoots = new WeakSet();
  const activeObservers     = new Set();

  // ── First-visit confirmation gate ────────────────────────────────────────
  // Resolved once per page load so the user is only asked once even when
  // safeClick is called multiple times (e.g. manage → reject two-step flows).
  let _domainApprovalPromise = null;

  // ── Whitelist state ───────────────────────────────────────────────────────
  // Cached per page-load so SETTINGS_UPDATED re-arm logic can gate on it
  // without doing an extra storage read every time the popup sends a message.
  let pageWhitelisted = false;

  // ── Reload-loop guard ────────────────────────────────────────────────────
  // Persists click count across page reloads (within the same tab session)
  // to detect when our clicks cause navigation/reloads → infinite loop.
  const SESSION_GUARD_KEY  = '__cookieGuardian_guard__';
  const MAX_SESSION_CLICKS = 2;      // after 2 click-then-reload cycles, stop
  const GUARD_WINDOW_MS    = 30000;  // 30 s — clicks older than this are ignored

  function getSessionClicks() {
    try {
      const raw = sessionStorage.getItem(SESSION_GUARD_KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      if (data.host === location.hostname && Date.now() - data.ts < GUARD_WINDOW_MS) {
        return data.clicks;
      }
      return 0;
    } catch (_) { return 0; }
  }

  function recordSessionClick() {
    try {
      const prev = getSessionClicks();
      sessionStorage.setItem(SESSION_GUARD_KEY, JSON.stringify({
        host: location.hostname, clicks: prev + 1, ts: Date.now(),
      }));
      return prev + 1;
    } catch (_) { return 0; }
  }

  function clearSessionGuard() {
    try { sessionStorage.removeItem(SESSION_GUARD_KEY); } catch (_) {}
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §2  CMP Dictionary
  //
  //  Every entry:
  //    name        Display name (for debug logs)
  //    containers  Selectors that prove the CMP is present in the DOM
  //    accept      Selectors for the "Accept All" button
  //    reject      Selectors for the "Reject / Necessary only" button
  //    manage      (optional) Opens preferences panel; used before rejecting
  //    shadowHost  (optional) CSS selector of the Web-Component shadow host
  //    scanIframe  (optional) true → also search inside same-origin iframes
  //    postClick   (optional) ms to wait after clicking "manage"
  //    note        Source / architectural note for maintainers
  // ══════════════════════════════════════════════════════════════════════════

  const CMP_DICTIONARY = [

    // ──────────────────────────────────────────────────────────────────────
    // SECTION A  —  Dataset CMPs  (24 entries from spreadsheet)
    // ──────────────────────────────────────────────────────────────────────

    {
      name: 'OneTrust',
      note: 'OptanonWrapper JS function; 4+ layout variants',
      containers: [
        '#onetrust-banner-sdk',
        '#onetrust-consent-sdk',
        '.optanon-alert-box-wrapper',
        '#onetrust-accept-btn-handler',   // sometimes the only visible node
      ],
      accept: [
        '#onetrust-accept-btn-handler',
        'button.onetrust-accept-btn-handler',
        '[class*="onetrust-accept"]',
      ],
      reject: [
        // Layout A — direct banner reject button
        '#onetrust-reject-all-handler',
        'button.onetrust-reject-all-handler',
        // Layout B — preference-centre "Reject All"
        '.ot-pc-refuse-all-handler',
        // Layout C — "Use necessary cookies only"
        '#accept-recommended-btn-handler',
        // Layout D — data-attribute deny
        '[data-optanon-btn-deny]',
        // Layout E — aria-label fallback (obfuscated class names)
        '[aria-label*="Reject"]',
        '[aria-label*="Decline"]',
        '[aria-label*="Necessary only"]',
      ],
      manage: [
        '#onetrust-pc-btn-handler',
        '.onetrust-pc-btn-handler',
        'button[class*="onetrust-pc"]',
      ],
      postClick: 900,
    },

    // OneTrust Preference Centre modal (sometimes shown alone)
    {
      name: 'OneTrust-PC',
      note: 'Preference Centre modal — appears without initial banner',
      containers: ['#onetrust-pc-sdk', '.ot-sdk-container', '#ot-sdk-btn-floating'],
      accept: ['#accept-recommended-btn-handler', '.save-preference-btn-handler'],
      reject: ['.ot-pc-refuse-all-handler', '#onetrust-reject-all-handler'],
    },

    {
      name: 'Cookiebot',
      note: 'Very static structure; adblockers target it first. Scans iframes for hosted deployments.',
      containers: [
        '#CybotCookiebotDialog',
        '#CybotCookiebotDialogBodyUnderlay',
        'div[id^="CybotCookiebot"]',
        // Cookiebot sets aria-describedby on <html>/<body> to reference the dialog ID
        '[aria-describedby="CybotCookiebotDialog"]',
        '[aria-modal="true"][id^="CybotCookiebot"]',
      ],
      accept: [
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
        '#CybotCookiebotDialogBodyButtonAccept',
        'a#CybotCookiebotDialogBodyLevelButtonAccept',
      ],
      reject: [
        '#CybotCookiebotDialogBodyButtonDecline',
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
        'a[id*="Decline"]',
        // Cookiebot "Allow selection" after unchecking all (covers secondary panel)
        '#CybotCookiebotDialogBodyLevelButtonAccept',
        // Button class patterns used by white-label Cookiebot deployments
        '.button-necessary',
        'button[class*="button-necessary"]',
        'button[class*="button-decline"]',
      ],
      scanIframe: true,
    },

    {
      name: 'Usercentrics',
      note: 'Shadow DOM — standard querySelector will not reach buttons',
      containers: ['#usercentrics-root'],
      shadowHost:  '#usercentrics-root',
      accept: [
        '[data-testid="uc-accept-all-button"]',
        'button[data-testid*="accept"]',
      ],
      reject: [
        '[data-testid="uc-deny-all-button"]',
        'button[data-testid*="deny"]',
        'button[data-testid*="reject"]',
      ],
    },

    {
      name: 'Didomi',
      note: 'Fixed bottom bar or centre pop-up',
      containers: [
        '#didomi-host',
        '#didomi-notice',
        '.didomi-popup-container',
      ],
      accept: [
        '#didomi-notice-agree-button',
        'button[class*="didomi-components-button--highlight"]',
      ],
      reject: [
        '#didomi-notice-disagree-button',
        'button[class*="didomi-components-button--secondary"]',
        // Preferences panel "Disagree to all" / "Tout refuser" button
        'button[class*="didomi-components-button"][aria-label*="disagree" i]',
        'button[class*="didomi-components-button"][aria-label*="refuser" i]',
        'button[class*="sdc-disagree-button"]',
        '#didomi-notice-disagree-button-handler',
      ],
      manage: [
        '.didomi-notice-learn-more-button',
        '#didomi-notice-learn-more-button',
      ],
      postClick: 700,
      // After the preferences panel opens and per-category "Refuser" toggles are
      // clicked, finalize by clicking "Tout refuser" or "Enregistrer" to close panel.
      manageFinalize: [
        '#didomi-notice-disagree-button',
        'button[class*="didomi-components-button--secondary"]',
        'button[aria-label*="refuser" i]',
        'button[aria-label*="disagree" i]',
      ],
    },

    {
      name: 'CookieYes',
      note: 'Formerly Cookie Law Info; cli- prefix on older deployments',
      containers: [
        '.cky-consent-container',
        '#cookie-law-info-bar',
        '.cky-modal',
      ],
      accept: [
        '.cky-btn-accept',
        'button[data-cky-tag="accept-button"]',
        '#wt-cli-accept-all-btn',
        '.cli-plugin-button.cli-plugin-main-button',
      ],
      reject: [
        '.cky-btn-reject',
        'button[data-cky-tag="reject-button"]',
        '#wt-cli-reject-btn',
      ],
    },

    {
      name: 'Iubenda',
      note: 'Highly specific div structure, easy to fingerprint',
      containers: ['#iubenda-cs-banner', '.iubenda-cs-container'],
      accept: ['.iubenda-cs-accept-btn', '[class*="iubenda-cs-accept"]'],
      reject: ['.iubenda-cs-reject-btn', '[class*="iubenda-cs-reject"]'],
    },

    {
      name: 'Osano',
      note: 'All classes begin with osano-cm- prefix',
      containers: ['.osano-cm-window', '.osano-cm-dialog', '[class^="osano-cm"]'],
      accept: ['.osano-cm-accept-all', 'button.osano-cm-button--type_accept'],
      reject: ['.osano-cm-denyAll',    'button.osano-cm-button--type_denyAll'],
    },

    {
      name: 'InMobi-Quantcast',
      note: 'TCF V2; complex DOM tree; mode attribute on buttons',
      containers: ['.qc-cmp2-container', '#qc-cmp2-ui', '#qcCmpUi'],
      accept: [
        '.qc-cmp2-summary-buttons button:last-child',
        'button.qc-cmp2-b-pbutton[mode="primary"]',
        '.qc-cmp2-b-pbutton[mode="primary"]',
      ],
      reject: [
        '.qc-cmp2-summary-buttons button:first-child',
        'button.qc-cmp2-b-pbutton[mode="secondary"]',
        '.qc-cmp2-b-pbutton[mode="secondary"]',
      ],
    },

    {
      name: 'Termly',
      note: 'Often inside an iframe or isolated div',
      containers: [
        '#termly-consent-banner',
        '#termly-code-snippet-support',
        '.t-consentPrompt',
      ],
      accept: ['.t-consentPrompt-accept', '.t-acceptAllButton', '[data-tid="banner-accept"]'],
      reject: ['.t-consentPrompt-decline', '[data-tid="banner-decline"]'],
      scanIframe: true,
    },

    {
      name: 'Axeptio',
      note: 'Widget in bottom corner; axeptio_ prefix',
      containers: ['#axeptio_overlay', '#axeptio_main_button'],
      accept: ['.axeptio_btn_acceptAll', '#axeptio__ButtonAccept'],
      reject: ['.axeptio_btn_dismiss', '#axeptio__ButtonDecline'],
    },

    {
      name: 'Complianz-WP',
      note: 'Directly embedded in WordPress HTML',
      containers: ['.cmplz-cookiebanner', '#cmplz-cookiebanner-container', '.cc-nb-main-container'],
      accept: ['.cmplz-accept', 'button.cc-nb-okagree'],
      reject: ['.cmplz-deny',   'button.cc-nb-reject'],
    },

    {
      name: 'Borlabs-WP',
      note: 'Thick centre modal on WP sites; borlabs- prefix',
      containers: ['#borlabs-cookie', '.borlabs-cookie-box'],
      accept: ['#borlabs-cookie .accept-all-cookies', 'button[data-cookie-accept-all]'],
      reject: ['#borlabs-cookie .decline-cookies',    'button[data-cookie-refuse]'],
    },

    {
      name: 'TrustArc',
      note: 'Legacy deployments use truste- IDs; newer use trustarc-. Two-step flows common on Audible, EA.',
      containers: [
        '#trustarc-consent-wrapper',
        '#truste-consent-track',
        '#truste-consent-content',
        '.truste_overlay',
        '[id^="pop-div"]',
      ],
      accept: [
        '#trustarc-accept-btn',
        '.te-consent-btn',
        '.pdynamicbutton .call',
        'a.trustarc-agree-btn',
      ],
      reject: [
        // Primary: "Required cookies only" / "Continue without accepting" on initial banner
        // Must be tried BEFORE opening the manage panel so the element is not obscured by the overlay
        '#truste-consent-required',
        'button#truste-consent-required',
        // Legacy and newer TrustArc layouts
        '.required.btn',
        'a.trustarc-decline-btn',
        '[data-testid="cookiepref-reject"]',
        // Inside the preferences panel after manage click
        '[class*="rejectAll"]',
        '[id*="rejectAll"]',
        'button[class*="reject-all"]',
        'a[class*="reject-all"]',
      ],
      manage:    ['#truste-show-consent', 'a[class*="truste-button2"]'],
      postClick: 1000,
      // After manage panel opens and no explicit reject button is found, click the
      // preference-center submit button to save "necessary only" selection and close the panel.
      manageFinalize: [
        '[id^="pop-div"] button[type="submit"]',
        '[id^="pop-div"] input[type="submit"]',
        '[id^="pop-div"] .pdynamicbutton',
        '#truste-pref-submit',
        '.trustarc-pref-center button[type="submit"]',
        '.pdynamicbutton button',
      ],
    },

    {
      name: 'Consentmanager',
      note: 'Very simple container names: cmpbox / cmpwrapper',
      containers: ['#cmpbox', '#cmpwrapper', '.cmpbox'],
      accept: ['.cmpboxbtnYes', '.cmpboxbtn.cmpboxbtnYes', '#cmpwelcome .cmpboxbtn'],
      reject: ['.cmpboxbtnno',  '.cmpboxbtn.cmpboxbtnno'],
    },

    {
      name: 'GDPR-Cookie-Compliance-Moove',
      note: 'Thin bar at bottom; moove-gdpr- prefix',
      containers: ['#moove_gdpr_cookie_info_bar', '.moove_gdpr_info_bar_container'],
      accept: ['.moove-gdpr-infobar-allow-all', '#moove-gdpr-cookie-infobar-allow-all'],
      reject: ['.moove-gdpr-infobar-reject-btn'],
    },

    {
      name: 'Cookie-Notice-Humanity',
      note: 'Simplest ID structure on the market',
      containers: ['#cookie-notice', '.cookie-notice-container'],
      accept: ['#cn-accept-cookie', 'a.cn-set-cookie'],
      reject: ['#cn-refuse-cookie'],
    },

    {
      name: 'Real-Cookie-Banner',
      note: 'Uses rcb- prefix exclusively',
      containers: ['.rcb-cookie-banner', '#rcb-cookie-banner'],
      accept: ['.rcb-btn-accept',  'button[class*="rcb-btn-accept"]'],
      reject: ['.rcb-btn-dismiss', 'button[class*="rcb-btn-dismiss"]'],
    },

    {
      name: 'Crownpeak-Evidon',
      note: 'Evidon infrastructure visible in DOM; evidon- prefix',
      containers: ['#evidon-banner', '#_evidon_banner'],
      accept: ['#evidon-banner-acceptbutton', '.evidon-banner-acceptbutton'],
      reject: ['#evidon-reject-button', '.evidon-banner-rejectbutton'],
    },

    {
      name: 'Securiti-AI',
      note: 'Banner div appended to end of <body>',
      containers: ['#securiti-consent-banner', '.securiti-banner-container'],
      accept: ['.securiti-accept-btn', 'button[class*="securiti-accept"]'],
      reject: ['.securiti-reject-btn'],
    },

    {
      name: 'DataGrail',
      note: 'New-generation tool; clear, semantic class names',
      containers: ['.datagrail-banner-container', '#datagrail-banner'],
      accept: ['.datagrail-accept-all'],
      reject: ['.datagrail-reject-all', '.datagrail-deny-all'],
    },

    {
      name: 'Ketch',
      note: 'API-focused; sometimes hides in Shadow DOM',
      containers: ['#ketch-smart-banner', '.ketch-banner', '[class^="ketch-"]'],
      shadowHost: '#ketch-smart-banner',
      accept: ['.ketch-btn-accept',  'button[class*="ketch-accept"]'],
      reject: ['.ketch-btn-decline', 'button[class*="ketch-decline"]'],
    },

    {
      name: 'Civic-UK',
      note: '"C" logo in corner on first visit; ccc- prefix',
      containers: ['#ccc-module', '#ccc', '.ccc-notify'],
      accept: ['#ccc-recommended-settings', '.ccc-notify-accept'],
      reject: ['#ccc-reject-settings',     '.ccc-notify-reject'],
    },

    {
      name: 'Illow',
      note: 'Sticky widget logic; illow- prefix',
      containers: ['#illow-widget-container', '.illow-widget'],
      accept: ['.illow-btn-accept', 'button[class*="illow-accept"]'],
      reject: ['.illow-btn-reject', 'button[class*="illow-reject"]'],
    },

    {
      name: 'PiwikPro-CMP',
      note: 'ppms_cm_ prefix throughout',
      containers: ['#ppms_cm_consent_popup', '#ppms_cm_popup_overlay', '.ppms-popup'],
      accept: ['#ppms_cm_agree-to-all', '#ppms_cm_agree-btn', 'button[id*="agree"]'],
      reject: ['#ppms_cm_reject-btn',   '[data-id="reject-all"]'],
    },

    // Cookie Information (cookieinformation.com) — Danish CMP
    {
      name: 'Cookie-Information',
      note: 'Danish CMP using coi- prefix; used by DSV, ECCO, Vestas, Maersk',
      containers: [
        '#coiOverlay',
        '#coiConsentBanner',
        '.coi-consent-banner',
        '#coiConsentBannerCategoriesWrapper',
        '[id^="coiConsentBanner"]',
        '[class*="coi-consent-banner"]',
        '[id^="coi-consent"]',
      ],
      accept: [
        '#coiConsentBannerBtnAcceptAll',
        '.coi-banner__accept',
        'button[data-action="accept"]',
        '[class*="coi-banner__accept"]',
        'button[id*="AcceptAll"]',
        '.coi-consent-banner__accept-all',
      ],
      reject: [
        '#coiConsentBannerBtnReject',
        '.coi-banner__decline',
        '.coi-banner__decline-all',
        'button[data-action="reject"]',
        '[class*="coi-banner__decline"]',
        '.coi-consent-banner__reject',
        '.coi-consent-banner__decline-all',
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    // SECTION B  —  Amazon Ecosystem
    //   Covers: amazon.com / .de / .co.uk / .fr / .it / .es / .co.jp
    //           imdb.com, primevideo.com, audible.com, twitch.tv,
    //           ring.com, alexa.amazon.com
    //   All share Amazon's "sp-cc" (Service Privacy Cookie Consent) system
    //   and the newer "a-declarative" action system.
    // ──────────────────────────────────────────────────────────────────────

    {
      name: 'Amazon-SP-CC',
      note: 'Amazon native cookie consent; covers IMDB, Prime Video, Audible',
      containers: [
        '#sp-cc',
        'div[data-cel-widget="sp-cc"]',
        '.sp-cc',
        '#privacy-consent-banner',
        '.a-section.a-spacing-base.a-text-center.sp-cc',
        // IMDB-specific
        '#consent-page',
        '.imdb-consent-banner',
        '[class*="consent-bump"]',
        // Amazon cookie preferences dialog
        '#a-popover-sp-cc',
        'form[action*="consent"]',
      ],
      accept: [
        '#sp-cc-accept',
        'input[name="accept"]',
        'button[data-action="sp-cc-accept"]',
        '[data-cel-widget="sp-cc-accept"]',
        '[data-a-target="accept-button"]',
        '.a-button-input[name="accept"]',
        // IMDB specific
        '[data-testid="accept-button"]',
        'button[data-testid*="accept"]',
        // Broader Amazon selectors
        'span.a-button-inner input[name="accept"]',
        '.celwidget input[type="submit"][name="accept"]',
        'input[data-action-type="ACCEPT_ALL"]',
      ],
      reject: [
        '#sp-cc-rejectall-link',
        '#sp-cc-rejectall',
        'a[data-action="sp-cc-rejectall"]',
        '[data-cel-widget="sp-cc-rejectall-link"]',
        '[data-a-target="reject-button"]',
        '#sp-cc-reject',
        // IMDB specific
        '[data-testid="reject-button"]',
        'button[data-testid*="reject"]',
        // Broader Amazon selectors
        'a[href*="sp-cc-rejectall"]',
        'input[data-action-type="REJECT_ALL"]',
      ],
    },

    // Amazon Advertising / DSP consent (sometimes separate banner)
    {
      name: 'Amazon-Privacy-Alert',
      note: 'Amazon "Your Privacy Choices" link banner on amazon.com front page',
      containers: ['.privacy-consent-modal', '.a-popover[id*="privacy"]', '#a-popover-sp-cc'],
      accept: ['button.a-button-primary[name*="accept"]', '#privacy-accept-button'],
      reject: ['button[name*="reject"]', '#privacy-reject-button'],
    },

    // Twitch (Amazon-owned) — uses its own consent system
    {
      name: 'Twitch-Consent',
      note: 'Twitch (Amazon subsidiary) cookie consent',
      containers: ['div[data-a-target="consent-banner"]', '.consent-banner'],
      accept: ['button[data-a-target="consent-banner-accept"]'],
      reject: ['button[data-a-target="consent-banner-reject"]'],
    },

    // ──────────────────────────────────────────────────────────────────────
    // SECTION C  —  EU Official Websites
    //   europa.eu, ec.europa.eu, publications.europa.eu, europarl.europa.eu,
    //   eur-lex.europa.eu, and all sub-domains of EU institutions.
    //
    //   The EU has standardised on the "EU Cookie Consent Kit" (CCK),
    //   a Drupal-based module mandated by DIGIT (EU IT services).
    //   URL: https://webgate.ec.europa.eu/fpfis/wikis/display/WEBDEV/CCK
    //
    //   Container pattern: .cck-container / #cookie-consent-banner
    //   Button pattern:    #cck-btn--accept-all / .cck-button--accept
    // ──────────────────────────────────────────────────────────────────────

    {
      name: 'EU-Cookie-Consent-Kit',
      note: 'EU DIGIT Cookie Consent Kit — mandated across all EU institutions',
      containers: [
        // CCK v1 / v2 (Drupal-based)
        '#cookie-consent-banner',
        '.cck-container',
        '.cck-block',
        '#eu-cookie-compliance-banner',
        '.eu-cookie-compliance-banner',
        // CCK v3 (2022+ refresh)
        '#cck-module',
        '.cck-module',
        // europarl.europa.eu
        '.epjs-cookie-banner',
        // eur-lex.europa.eu
        '#eurlex-cookie-consent',
        // publications.europa.eu
        '.publications-eu-cookies',
        // Older Drupal eu_cookie_compliance module
        '.cookie-compliance-banner',
        '#cookie-compliance-banner',
      ],
      accept: [
        // CCK v1/v2
        '.cck-button--accept',
        '#cck-btn--accept-all',
        '.eu-cookie-compliance-agree-button',
        'a.agree-button',
        // CCK v3
        '#cck-btn-accept',
        '.cck-btn--accept',
        // europarl
        '.epjs-cookie-btn-accept',
        // Drupal eu_cookie_compliance
        '.agree-button.eu-cookie-compliance-agree-button',
        // Generic EU button class
        '[class*="cck-button"][class*="accept"]',
        '[data-cck-action="accept"]',
      ],
      reject: [
        // CCK — "Only necessary"
        '.cck-button--refuse',
        '#cck-btn--refuse-all',
        '.eu-cookie-compliance-reject-button',
        'a.eu-cookie-compliance-reject-button',
        // CCK v3
        '#cck-btn-refuse',
        '.cck-btn--refuse',
        // europarl
        '.epjs-cookie-btn-refuse',
        // Generic
        '[data-cck-action="refuse"]',
        '[data-cck-action="reject"]',
      ],
      manage: [
        '.cck-button--preferences',
        '#cck-btn--preferences',
        '.eu-cookie-compliance-more-button',
        '[data-cck-action="preferences"]',
      ],
      postClick: 700,
    },

    // European Parliament has its own slightly different banner
    {
      name: 'EuroParl-Cookie',
      note: 'europarl.europa.eu — own Drupal theme with epjs- prefix',
      containers: ['.epjs-cookie-consent', '#epjs-cookie-module'],
      accept: ['.epjs-cookie-btn--accept', 'button[id*="epjs-accept"]'],
      reject: ['.epjs-cookie-btn--refuse', 'button[id*="epjs-refuse"]'],
    },

    // ──────────────────────────────────────────────────────────────────────
    // SECTION D  —  German Federal & Public Sector Websites
    //   bundesregierung.de, bund.de, bundestag.de, bmj.de, bmi.bund.de,
    //   destatis.de, bafin.de, bpb.de, etc.
    //   German public broadcasters: ard.de, zdf.de, mdr.de, ndr.de
    //
    //   Most federal sites (IT-Bund / FITKO) use:
    //     a) etracker Consent Manager
    //     b) SZM (Skalierbare Zentrale Messverfahren — INFOnline)
    //     c) Consentmanager.net (already covered above)
    //     d) Custom TYPO3/Drupal solutions
    // ──────────────────────────────────────────────────────────────────────

    {
      name: 'etracker-Consent',
      note: 'Used by many German federal sites (bund.de, bmj.de, destatis.de)',
      containers: [
        '#et-consent-banner',
        '.et-consent-banner',
        '.et-cookie-manager',
        '#etConsent',
        // Some deployments
        '[id^="etracker-"]',
        '[class^="etracker-"]',
      ],
      accept: [
        '#et-consent-accept-all',
        '.et-consent-accept-all',
        '.et-consent-btn--accept',
        'button[data-consent-action="acceptAll"]',
        '[id*="etracker"][id*="accept"]',
      ],
      reject: [
        '#et-consent-decline-all',
        '.et-consent-decline-all',
        '.et-consent-btn--decline',
        'button[data-consent-action="declineAll"]',
        'button[data-consent-action="acceptRequired"]',
      ],
    },

    // Bundesregierung.de (German Federal Government) uses a custom banner
    {
      name: 'Bundesregierung-Cookie',
      note: 'bundesregierung.de — custom TYPO3 cookie notice',
      containers: [
        '.cookie-note',
        '.js-cookie-note',
        '#cookie-note',
        '.breg-cookie-banner',
        '[class*="cookieBanner"]',
        '[id*="cookieBanner"]',
      ],
      accept: [
        '.cookie-note__button--accept',
        '.js-cookie-note-accept',
        '[data-action="cookie-accept-all"]',
        'button[class*="cookie"][class*="accept"]',
      ],
      reject: [
        '.cookie-note__button--reject',
        '.js-cookie-note-reject',
        '[data-action="cookie-reject"]',
        'button[class*="cookie"][class*="reject"]',
      ],
    },

    // Bundestag.de
    {
      name: 'Bundestag-Cookie',
      note: 'bundestag.de specific cookie consent',
      containers: ['#cookieConsent', '.cookieconsent-banner', '#bt-cookie-consent'],
      accept: ['.cookieconsent-accept-all', '#bt-cookie-accept-all'],
      reject: ['.cookieconsent-reject', '#bt-cookie-reject'],
    },

    // ARD / ZDF / German public broadcasting
    // Uses INFOnline SZM and often a custom ORM-based consent
    {
      name: 'ARD-ZDF-Public-Broadcasting',
      note: 'German public broadcasters (ard.de, zdf.de, mdr, ndr, wdr, hr)',
      containers: [
        // ARD / Tagesschau
        '.consent-banner',
        '#consent-banner',
        '.ard-cookie-modal',
        '.szm-cookie-banner',
        // ZDF
        '.zdf-cookie-consent',
        '#cookieConsent',
        '.zdf__cookie-consent',
        // NDR / MDR custom
        '.cookieBanner',
        '#cookieBanner',
        // Generic INFOnline SZM
        '[class*="szm-"][class*="consent"]',
        '[id*="szm"][id*="consent"]',
      ],
      accept: [
        // ARD
        '.consent-button--accept',
        '.ard-cookie-modal__btn--accept',
        'button[data-consent="accept-all"]',
        // ZDF
        '.zdf-cookie-consent__btn--accept',
        '.c-button--accept',
        // Generic
        'button[id*="accept"][id*="cookie"]',
        '.cookieBanner__accept',
      ],
      reject: [
        '.consent-button--reject',
        '.ard-cookie-modal__btn--reject',
        'button[data-consent="reject-all"]',
        '.zdf-cookie-consent__btn--reject',
        '.cookieBanner__reject',
        'button[id*="reject"][id*="cookie"]',
        // "Only essential"
        'button[data-consent="accept-essential"]',
        '.consent-button--essential',
      ],
    },

    // TrustCommander / Commanders Act (TC)
    {
      name: 'Commanders-Act-TrustCommander',
      note: 'Used by La Poste, SNCF, and many French sites; popin_tc_ prefix',
      containers: [
        '#popin_tc_privacy',
        '#popin_tc_privacy_container',
        '.tc-privacy-wrapper',
        '.popin-tc-privacy-container',
        '[id^="popin_tc_privacy"]',
      ],
      accept: [
        '#popin_tc_privacy_button_2',
        '.tc-submit-privacy',
        '.tc-privacy-btn--accept-all',
        'button[id*="popin_tc_privacy_button_2"]',
        '[class*="tc-privacy"][class*="accept"]',
      ],
      reject: [
        '#popin_tc_privacy_button_3',
        '.tc-refuse-all',
        '.tc-privacy-btn--refuse-all',
        'button[id*="popin_tc_privacy_button_3"]',
        '[class*="tc-privacy"][class*="refuse"]',
        '[class*="tc-privacy"][class*="reject"]',
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    // SECTION E  —  Additional common CMPs not in original dataset
    // ──────────────────────────────────────────────────────────────────────

    {
      name: 'Sourcepoint',
      note: 'Often inside an iframe; used by many media publishers',
      containers: ['[id^="sp_message_container"]', '#sp-cc', 'div[id^="sp_"]'],
      shadowHost:  '[id^="sp_message_container"]',
      scanIframe: true,
      accept: [
        '[title="Accept All"]',
        '[title="Alle akzeptieren"]',
        '[title="Tout accepter"]',
        '[title="Accetta tutto"]',
        '.sp_choice_type_11',
        'button[class*="accept"]',
        '[data-choice-id="11"]',
        'button[title*="Accept"]',
        'button[title*="akzeptieren"]',
        'button[aria-label*="Accept"]',
      ],
      reject: [
        '[title="Reject All"]',
        '[title="Alle ablehnen"]',
        '[title="Tout refuser"]',
        '[title="Rifiuta tutto"]',
        '.sp_choice_type_13',
        '[data-choice-id="13"]',
        'button[class*="reject"]',
        'button[title*="Reject"]',
        'button[title*="ablehnen"]',
        'button[aria-label*="Reject"]',
      ],
      manage:    ['[title="Manage Preferences"]', '[title="Einstellungen"]', '.sp_choice_type_12'],
      postClick: 1000,
    },

    {
      name: 'HubSpot',
      note: 'HubSpot integrated cookie notification bar',
      containers: ['#hs-eu-cookie-confirmation', '#hs-banner-parent'],
      accept: ['#hs-eu-confirmation-button', 'a[id*="hs-eu-confirmation"]'],
      reject: ['#hs-eu-decline-button',       'a[id*="hs-eu-decline"]'],
    },

    {
      name: 'CookieConsent-OrestBida',
      note: 'cookie-consent v3 by Orest Bida (open source, very common)',
      containers: ['#cc-main', '.cc--anim', '.cc-window'],
      accept: [
        '#c-p-bn', '#c-all-bn',
        '.c-bn[data-cc="accept-all"]',
        'button[data-cc="accept-all"]',
      ],
      reject: [
        '#c-rall-bn',
        '.c-bn[data-cc="accept-necessary"]',
        'button[data-cc="accept-necessary"]',
      ],
      manage:    ['#c-settings-bn', 'button[data-cc="show-preferencesModal"]'],
      postClick: 600,
    },

    {
      name: 'Klaro',
      note: 'Open-source Klaro CMP',
      containers: ['.klaro', '#klaro'],
      accept: ['.cm-btn.cm-btn-success-var', '.cm-btn.cm-btn-success'],
      reject: ['.cm-btn.cn-decline', '[data-type="decline"]'],
    },

    {
      name: 'WP-GDPR-Cookie-Notice',
      note: 'WordPress Cookie Notice plugin (van Ons)',
      containers: ['#cookie-notice-wrapper', '.cn-wrapper'],
      accept: ['#cn-notice-accept', '.cn-notice-btn-ok'],
      reject: ['#cn-notice-decline'],
    },

    {
      name: 'CookieHub',
      note: 'CookieHub SaaS CMP',
      containers: ['.ch2-container', '#ch2-dialog', '.ch2'],
      accept: ['.ch2-btn.ch2-btn--accept', 'button[data-ch2-action="accept-all"]'],
      reject: ['.ch2-btn.ch2-btn--reject', 'button[data-ch2-action="reject-all"]'],
    },

    {
      name: 'Metomic',
      note: 'Metomic consent manager (popular in SaaS/startup space)',
      containers: ['.metomic-ConsentWall', '[id^="metomic-"]'],
      accept: ['.metomic-ConsentWall-primaryButton', 'button[data-id="allowAll"]'],
      reject: ['.metomic-ConsentWall-secondaryButton', 'button[data-id="denyAll"]'],
    },

    {
      name: 'Admiral-VRM',
      note: 'Admiral VRM consent manager',
      containers: ['#adm-consent-overlay', '.adm-consent-manager'],
      accept: ['.adm-accept-all'],
      reject: ['.adm-deny-all'],
    },

    // GOV.UK Design System Cookie Banner
    {
      name: 'GOVUK-Cookie-Banner',
      note: 'GOV.UK Design System cookie banner (custom, used across UK gov sites)',
      containers: [
        '.govuk-cookie-banner',
        '#global-cookie-message',
        '[data-module="cookie-banner"]',
        '.gem-c-cookie-banner',
        '#cookie-banner',
      ],
      accept: [
        'button[data-accept-cookies="true"]',
        'button[data-module="cookie-banner-accept"]',
        '.js-cookie-banner-accept',
        '.gem-c-cookie-banner__accept-button',
        'button[value="accept"]',
      ],
      reject: [
        'button[data-reject-cookies="true"]',
        'button[data-module="cookie-banner-reject"]',
        '.js-cookie-banner-reject',
        '.gem-c-cookie-banner__reject-button',
        'button[value="reject"]',
      ],
    },

    // ──────────────────────────────────────────────────────────────────────
    // SECTION F  —  Nordic Bank / Financial Sector Custom Banners
    // ──────────────────────────────────────────────────────────────────────

    // Danske Bank — custom two-panel cookie consent
    // Initial panel shows category checkboxes, secondary panel may appear.
    // Button classes observed in test logs: "button button-accept" (accept).
    // The reject/necessary-only button is expected as "button button-necessary"
    // or similar; the text "OK to necessary" is the visible label.
    {
      name: 'Danske-Bank',
      note: 'danskebank.com custom cookie banner with category checkboxes',
      containers: [
        // Primary containers (guessed from class patterns)
        '[class*="cookie-modal"]',
        '[class*="cookieModal"]',
        '[class*="cookie-banner"][class*="modal"]',
        '[class*="consent-modal"]',
        // Cookiebot sets aria-describedby on the root when hosting the dialog
        '[aria-describedby*="cookie" i][role="dialog"]',
        '[aria-labelledby*="cookie" i][role="dialog"]',
        // Fallback: any dialog whose heading mentions cookies
        'dialog[open]',
      ],
      accept: [
        '.button-accept',
        'button[class*="button-accept"]',
        'button[class*="buttonAccept"]',
      ],
      reject: [
        // "OK to necessary" buttons — multiple class-name conventions
        '.button-necessary',
        '.button-decline',
        '.button-required',
        'button[class*="button-necessary"]',
        'button[class*="button-decline"]',
        'button[class*="button-required"]',
        'button[class*="buttonNecessary"]',
        'button[class*="buttonDecline"]',
        'button[class*="buttonRequired"]',
      ],
    },

    // Cassie CMP (used by DFDS and similar)
    {
      name: 'Cassie',
      note: 'Cassie CMP by Syrenis — uses cassie_ prefixed IDs. Initial banner has Reject/Accept/Manage buttons.',
      containers: [
        '[id^="cassie_nb"]',
        '[id*="cassie"][id*="container"]',
        '[class*="cassie-cookie"]',
        '[class*="cassie_cookie"]',
      ],
      accept: [
        '[id*="cassie"][id*="accept"]',
        'button[id*="cassie_nb_accept"]',
        'button[id*="cassie_accept_pre_preferences"]',
      ],
      reject: [
        '[id*="cassie"][id*="reject"]',
        'button[id*="cassie_nb_reject"]',
        'button[id*="cassie_reject_pre_preferences"]',
        'button[id*="cassie_reject_all"]',
      ],
      manage: [
        '[id*="cassie"][id*="preferences"]',
        'button[id*="cassie_nb_preferences"]',
      ],
      postClick: 800,
      manageFinalize: [
        'button[id*="cassie_save"]',
        'button[id*="cassie_reject_all"]',
        'button[id*="cassie_confirm"]',
      ],
    },

    // Maybelline / L'Oréal OneTrust variant
    {
      name: 'OneTrust-Loreal',
      note: 'L\'Oréal group sites (Maybelline, Garnier etc.) use OneTrust with custom layout',
      containers: [
        '#ot-sdk-btn-floating',
        '.ot-sdk-container',
        '[class*="onetrust"]',
        '#onetrust-banner-sdk',
      ],
      accept: [
        '#onetrust-accept-btn-handler',
        '.onetrust-accept-btn-handler',
        'button[id*="accept"][class*="onetrust"]',
      ],
      reject: [
        '#onetrust-reject-all-handler',
        '.ot-pc-refuse-all-handler',
        'button[id*="reject"][class*="onetrust"]',
      ],
    },

  ]; // end CMP_DICTIONARY


  // ══════════════════════════════════════════════════════════════════════════
  // §3  Multilingual text-pattern banks
  //     Tested against normalised element labels.
  //     ^ anchored patterns score 12; substring patterns score 7.
  //     Languages: EN, TR, DE, FR, ES, IT, NL, PT, PL, SV, NO, DA, FI,
  //                CS, SK, EL, RO, HU, JA, KO, ZH
  // ══════════════════════════════════════════════════════════════════════════

  const ACCEPT_PATTERNS = [
    // ── English ────────────────────────────────────────────────────────
    /^accept\s+all\b/i,    /^allow\s+all\b/i,      /^agree\s+to\s+all\b/i,
    /^consent\s+to\s+all\b/i,  /^i\s+accept\b/i,  /^yes[,!\s]+accept/i,
    /^got\s+it!?$/i,       /^ok(ay)?[!.\s]*$/i,    /^agree\b/i,
    // Standalone short-form patterns (from Cookie Consent Automator)
    /^accept$/i,           /^allow$/i,
    /accept\s+cookies?\b/i,
    /^accept\s+.*cookies?\b/i,
    /^allow\s+.*cookies?\b/i,
    // ── Turkish ────────────────────────────────────────────────────────
    /^tümünü\s+kabul\s+et\b/i, /^kabul\s+et\b/i,  /^hepsini\s+kabul\s+et\b/i,
    /^tümüne\s+izin\s+ver\b/i, /^tümünü\s+onayla\b/i,
    /^çerezleri\s+kabul\s+et\b/i,
    /^onaylıyorum\b/i,
    // ── German ─────────────────────────────────────────────────────────
    /^alle\s+akzeptieren\b/i, /^alles\s+akzeptieren\b/i, /^alle\s+zulassen\b/i,
    /^alle\s+cookies?\s+akzeptieren\b/i, /^zustimmen\b/i,
    /^ich\s+stimme\s+zu\b/i, /^akzeptieren\b/i,
    /^alle\s+auswählen\b/i, /^einverstanden\b/i,
    /^alle\s+annehmen\b/i, /^annehmen\b/i,
    // ── French ─────────────────────────────────────────────────────────
    /^tout\s+accepter\b/i, /^accepter\s+tout\b/i,
    /^j'accepte\b/i, /^accepter\b/i, /^je\s+suis\s+d'accord\b/i,
    // ── Spanish ────────────────────────────────────────────────────────
    /^aceptar\s+todo\b/i,  /^aceptar\s+todas\b/i,
    /^acepto\s+todo\b/i,   /^aceptar\b/i,
    // ── Italian ────────────────────────────────────────────────────────
    /^accetta\s+tutto\b/i, /^accetta\s+tutti\b/i, /^accetto\b/i,
    /^acconsento\b/i,
    // ── Dutch ──────────────────────────────────────────────────────────
    /^alles\s+accepteren\b/i, /^alle\s+cookies\s+accepteren\b/i,
    /^akkoord\b/i, /^accepteer\s+alles\b/i,
    // ── Portuguese ─────────────────────────────────────────────────────
    /^aceitar\s+tudo\b/i,  /^aceito\s+tudo\b/i,  /^aceitar\b/i,
    // ── Polish ─────────────────────────────────────────────────────────
    /^akceptuj\s+wszystko\b/i, /^zaakceptuj\s+wszystkie\b/i, /^akceptuję\b/i,
    // ── Swedish / Norwegian / Danish ───────────────────────────────────
    /^acceptera\s+alla\b/i, /^godkänn\s+alla\b/i, /^godkend\s+alle\b/i,
    /^godta\s+alle\b/i, /^tillad\s+alle\b/i,
    // ── Finnish ────────────────────────────────────────────────────────
    /^hyväksy\s+kaikki\b/i, /^hyväksyn\b/i,
    // ── Czech / Slovak ─────────────────────────────────────────────────
    /^přijmout\s+vše\b/i, /^prijať\s+všetko\b/i,
    // ── Greek ──────────────────────────────────────────────────────────
    /^αποδοχή\s+όλων\b/i, /^αποδέχομαι\s+όλα\b/i,
    // ── Romanian ───────────────────────────────────────────────────────
    /^acceptați?\s+toate\b/i,
    // ── Hungarian ──────────────────────────────────────────────────────
    /^elfogad\s+mindent\b/i, /^mindet\s+elfogadom\b/i,
    // ── CJK ────────────────────────────────────────────────────────────
    /全て(に)?同意/, /すべて(を)?受け入れる/, /모두\s*동의/, /全部接受/, /接受所有/,
  ];

  const REJECT_PATTERNS = [
    // ── English ────────────────────────────────────────────────────────
    /^reject\s+all\b/i,    /^decline\s+all\b/i,   /^deny\s+all\b/i,
    /^refuse\s+all\b/i,    /^no\s+thanks?\.?$/i,
    /^only\s+(strictly\s+)?(necessary|essential|required)\b/i,
    /^use\s+necessary\s+only\b/i, /strictly\s+necessary\s+only/i,
    /^do\s+not\s+(consent|accept)\b/i,
    /^save\s+my\s+preferences\b/i,
    /^continue\s+without\s+accepting\b/i,
    /^necessary\s+cookies\s+only\b/i,
    /^essential\s+only\b/i,
    // Standalone short-form patterns (from Cookie Consent Automator)
    /^reject$/i,           /^decline$/i,          /^refuse$/i,
    /necessary\s+only/i,   /strictly\s+necessary/i,
    /reject\s+non[\s-]?essential/i,
    /^reject\s+.*cookies?\b/i,
    /^decline\s+.*cookies?\b/i,
    /^refuse\s+.*cookies?\b/i,
    // "OK to necessary" family (e.g. Danske Bank, similar secondary panels)
    /^ok\s+to\s+necessary\b/i,
    /^ok\s+to\s+(required|essential)\b/i,
    // ── Turkish ────────────────────────────────────────────────────────
    /^reddet\b/i, /^tümünü\s+reddet\b/i, /^hepsini\s+reddet\b/i,
    /^çerezleri\s+reddet\b/i, /^kabul\s+etmiyorum\b/i,
    /^sadece\s+gerekli\b/i, /^yalnızca\s+zorunlu\b/i,
    /^zorunlu\s+çerezler\b/i,
    // ── German ─────────────────────────────────────────────────────────
    /^alle\s+ablehnen\b/i, /^alles\s+ablehnen\b/i, /^ablehnen\b/i,
    /^nicht\s+akzeptieren\b/i,
    /^nur\s+(notwendige|essenzielle)\s+cookies?\b/i,
    /^ohne\s+einwilligung\s+fortfahren\b/i,
    /^weiter\s+ohne\s+einwilligung\b/i,
    /^nur\s+notwendige\b/i, /^notwendige\s+cookies?\s+akzeptieren\b/i,
    // "Auswahl bestätigen" = confirm selection (reject-equivalent when only necessary is checked)
    /^auswahl\s+bestätigen\b/i, /^auswahl\s+bestatigen\b/i,
    // ── French ─────────────────────────────────────────────────────────
    /^tout\s+refuser\b/i, /^refuser\s+tout\b/i,
    /\btout\s+refuser\b/i,
    /^je\s+refuse\b/i, /^continuer\s+sans\s+accepter\b/i, /^refuser\b/i,
    /^seulement\s+nécessaires\b/i,
    // ── Spanish ────────────────────────────────────────────────────────
    /^rechazar\s+todo\b/i, /^rechazar\s+todas\b/i,
    /^rechazar\b/i, /^no\s+acepto\b/i, /^solo\s+necesarias\b/i,
    // ── Italian ────────────────────────────────────────────────────────
    /^rifiuta\s+tutto\b/i, /^rifiuta\s+tutti\b/i, /^rifiuto\b/i,
    /^solo\s+necessari\b/i,
    // ── Dutch ──────────────────────────────────────────────────────────
    /^alles\s+weigeren\b/i, /^alles\s+afwijzen\b/i, /^weigeren\b/i,
    /^alleen\s+noodzakelijk\b/i,
    // ── Portuguese ─────────────────────────────────────────────────────
    /^rejeitar\s+tudo\b/i, /^recusar\s+tudo\b/i, /^rejeitar\b/i,
    // ── Polish ─────────────────────────────────────────────────────────
    /^odrzuć\s+wszystko\b/i, /^odmów\b/i,
    // ── Swedish / Norwegian / Danish ───────────────────────────────────
    /^avvisa\s+alla\b/i, /^avvis\s+alle\b/i, /^afvis\s+alle\b/i,
    /^neka\s+alla\b/i,   /^afvis\b/i,
    // Danish: "kun nødvendige" = "only necessary"
    /^kun\s+nødvendige\b/i,
    /^kun\s+nødvendige\s+cookies?\b/i,
    // Swedish: "endast nödvändiga"
    /^endast\s+nödvändiga\b/i,
    /^acceptera\s+nödvändiga\b/i,
    // ── Finnish ────────────────────────────────────────────────────────
    /^hylkää\s+kaikki\b/i,
    // ── Czech / Slovak ─────────────────────────────────────────────────
    /^odmítnout\s+vše\b/i, /^odmietnuť\s+všetko\b/i,
    // ── Greek ──────────────────────────────────────────────────────────
    /^απόρριψη\s+όλων\b/i,
    // ── CJK ────────────────────────────────────────────────────────────
    /全て(を)?拒否/, /必要なもの(のみ)?を受け入れる/, /모두\s*거부/, /全部拒绝/, /拒绝所有/,
  ];

  // Key phrases for XPath second-pass (one per major language)
  const REJECT_XPATH = [
    'reject all',      'decline all',       'only necessary',
    'tümünü reddet',   'reddet',            'sadece gerekli',
    'alle ablehnen',   'ablehnen',          'nur notwendige',
    'tout refuser',    'refuser',           'continuer sans accepter',
    'rechazar todo',   'rifiuta tutto',     'alles weigeren',
    'rejeitar tudo',   'odrzuć wszystko',   'avvisa alla',
    'hylkää kaikki',   'odmítnout vše',
    // Additional terms from Cookie Consent Automator
    'reject non-essential', 'necessary only',
    // Secondary-panel / "OK to necessary" style buttons (e.g. Danske Bank)
    'ok to necessary', 'ok to required',    'ok to essential',
    // Danish / Norwegian / Swedish
    'kun nødvendige',  'endast nödvändiga',
    // German government / confirm-selection style (Bundesrat)
    'auswahl bestätigen', 'auswahl bestatigen',
  ];
  const ACCEPT_XPATH = [
    'accept all',      'allow all',
    'tümünü kabul',    'kabul et',
    'alle akzeptieren','akzeptieren',       'zustimmen',
    'tout accepter',   'accepter',
    'aceptar todo',    'accetta tutto',
    'alles accepteren','hyväksy kaikki',
    // Additional terms from Cookie Consent Automator
    'accept cookies',  'onaylıyorum',
    // German
    'alle annehmen',   'annehmen',
  ];


  // ══════════════════════════════════════════════════════════════════════════
  // §4  Shadow DOM piercing engine
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Recursively collect every shadow root reachable from a root node.
   * Uses breadth-first traversal for performance.
   */
  function collectShadowRoots(root = document) {
    const result = [];
    const queue  = [root];
    while (queue.length) {
      const node = queue.shift();
      let elems;
      try {
        // If node itself is a shadow root, query inside it; otherwise use node
        const ctx = (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) ? node : node;
        elems = ctx.querySelectorAll ? ctx.querySelectorAll('*') : [];
      } catch (_) { continue; }
      for (const el of elems) {
        if (el.shadowRoot) {
          result.push(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
      }
    }
    return result;
  }

  /**
   * Memoises collectShadowRoots(root) per root for one detection pass — avoids
   * dozens of full-document '*' walks inside a single attemptHandle tick.
   */
  function createShadowRootCache() {
    const cache = new WeakMap();
    return function getShadowRoots(r) {
      if (!r) return [];
      if (cache.has(r)) return cache.get(r);
      const list = collectShadowRoots(r);
      cache.set(r, list);
      return list;
    };
  }

  /** querySelector that falls through light DOM then all reachable shadow roots. */
  function deepQuery(selector, root = document, getShadowRoots = null) {
    try { const d = root.querySelector(selector); if (d) return d; } catch (_) {}
    const roots = getShadowRoots ? getShadowRoots(root) : collectShadowRoots(root);
    for (const sr of roots) {
      try { const f = sr.querySelector(selector); if (f) return f; } catch (_) {}
    }
    return null;
  }

  /** querySelectorAll across light DOM + every shadow root. */
  function deepQueryAll(selector, root = document, getShadowRoots = null) {
    const out = [];
    try { out.push(...root.querySelectorAll(selector)); } catch (_) {}
    const roots = getShadowRoots ? getShadowRoots(root) : collectShadowRoots(root);
    for (const sr of roots) {
      try { out.push(...sr.querySelectorAll(selector)); } catch (_) {}
    }
    return out;
  }

  /** Return the named shadow root for a CMP profile that declares shadowHost. */
  function getProfileShadowRoot(profile) {
    if (!profile.shadowHost) return null;
    try {
      const host = document.querySelector(profile.shadowHost);
      return host?.shadowRoot ?? null;
    } catch (_) { return null; }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §5  Universal DOM query helpers
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Return first match from a selector list.
   * Priority: explicit shadow root → light DOM → deep-pierce all roots.
   */
  function queryFirst(selectors, root = document, shadowRoot = null, getShadowRoots = null) {
    for (const sel of selectors) {
      try {
        if (shadowRoot) { const e = shadowRoot.querySelector(sel); if (e) return e; }
        const light = root.querySelector(sel);  if (light) return light;
        const deep  = deepQuery(sel, root, getShadowRoots); if (deep) return deep;
      } catch (_) {}
    }
    return null;
  }

  /**
   * XPath text search — finds interactive elements whose visible text
   * contains the given string (case-insensitive).
   * Much faster than iterating every node for substring matching.
   */
  function xpathText(text, ctx = document.body) {
    if (!ctx) return null;
    const lo = text.toLowerCase().replace(/'/g, "\\'");
    const UP  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LO  = 'abcdefghijklmnopqrstuvwxyz';
    const expr = `.//*[contains(
        translate(normalize-space(.),'${UP}','${LO}'), '${lo}'
      ) and (
        self::button or self::a or
        (self::div   and @role='button') or
        (self::span  and @role='button') or
        self::input[@type='button' or @type='submit']
      )]`;
    try {
      const r = document.evaluate(expr, ctx, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return r.singleNodeValue ?? null;
    } catch (_) { return null; }
  }

  /** Like xpathText but skips navigational <a href="http…"> matches (SERP / article links). */
  function xpathTextFirstSafe(text, ctx = document.body) {
    if (!ctx) return null;
    const lo = text.toLowerCase().replace(/'/g, "\\'");
    const UP  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LO  = 'abcdefghijklmnopqrstuvwxyz';
    const expr = `.//*[contains(
        translate(normalize-space(.),'${UP}','${LO}'), '${lo}'
      ) and (
        self::button or self::a or
        (self::div   and @role='button') or
        (self::span  and @role='button') or
        self::input[@type='button' or @type='submit']
      )]`;
    try {
      const r = document.evaluate(expr, ctx, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      for (let i = 0; i < r.snapshotLength; i++) {
        const node = r.snapshotItem(i);
        if (node && isVisible(node) && !isUnsafeHeuristicAnchor(node)) return node;
      }
    } catch (_) {}
    return null;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §6  Element visibility & safe-click helpers
  // ══════════════════════════════════════════════════════════════════════════

  function log(...a)  { if (settings.debugMode) console.log('[CookieGuardian]', ...a); }
  function warn(...a) { console.warn('[CookieGuardian]', ...a); }
  function delay(ms)  { return new Promise(r => setTimeout(r, ms)); }

  /**
   * Visibility check that works inside shadow roots
   * (where offsetParent is always null).
   */
  function isVisible(el) {
    if (!el) return false;
    try {
      if (el.offsetParent !== null) return true;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return true;
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    } catch (_) { return true; }   // assume visible if check throws
  }

  /** Normalise an element's display label for pattern matching. */
  function getLabel(el) {
    return (
      el.textContent ||
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      el.getAttribute('value') ||
      el.getAttribute('data-label') ||
      ''
    ).replace(/\s+/g, ' ').trim();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // §5b  First-visit confirmation helpers
  // ══════════════════════════════════════════════════════════════════════════

  const TRUSTED_DOMAINS_KEY = 'cg_trusted_domains';
  const WL_KEY_NORMAL       = 'cg_whitelisted_domains';
  const WL_KEY_PRIVATE      = 'cg_whitelisted_domains_private';
  let   activeWlKey         = WL_KEY_NORMAL;

  function getTrustedDomains() {
    return new Promise(resolve => {
      chrome.storage.local.get({ [TRUSTED_DOMAINS_KEY]: [] }, result => {
        resolve(new Set(result[TRUSTED_DOMAINS_KEY]));
      });
    });
  }

  function isWhitelisted() {
    return new Promise(resolve => {
      chrome.storage.local.get({ [activeWlKey]: [] }, result => {
        const list = result[activeWlKey];
        const host = location.hostname;
        const bare = host.replace(/^www\./, '');
        resolve(list.includes(host) || list.includes(bare));
      });
    });
  }

  function trustDomain(hostname) {
    return new Promise(resolve => {
      chrome.storage.local.get({ [TRUSTED_DOMAINS_KEY]: [] }, result => {
        const set = new Set(result[TRUSTED_DOMAINS_KEY]);
        set.add(hostname);
        chrome.storage.local.set({ [TRUSTED_DOMAINS_KEY]: [...set] }, resolve);
      });
    });
  }

  /**
   * Non-blocking countdown toast: auto-proceeds after `seconds` seconds.
   * The user only needs to act to *cancel* — zero friction on legitimate sites.
   * Returns a Promise<'proceed'|'always'|'skip'>.
   *   'proceed' — countdown expired, go ahead (domain not saved)
   *   'always'  — user clicked "Always trust", save domain and go ahead
   *   'skip'    — user cancelled, do not click
   */
  function showCountdownToast(hostname, seconds = 4) {
    return new Promise(resolve => {
      const host = document.createElement('div');
      const sr   = host.attachShadow({ mode: 'open' });

      const style       = document.createElement('style');
      style.textContent = `
        .cg-toast {
          position: fixed; bottom: 20px; right: 20px;
          background: #ffffff; color: #000000;
          border: 1px solid #000000; border-radius: 8px;
          padding: 14px 16px; z-index: 2147483647;
          font: 14px/1.43 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          max-width: 300px; min-width: 240px;
        }
        .cg-header  { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .cg-title   { font-weight: 700; font-size: 16px; line-height: 1.25; color: #000000; }
        .cg-host    { font-size: 12px; color: #4b4b4b; margin-bottom: 8px; word-break: break-all; }
        .cg-body    { font-size: 13px; color: #4b4b4b; margin-bottom: 10px; line-height: 1.5; }
        .cg-bar-bg  {
          height: 3px; background: #efefef; border-radius: 999px; margin-bottom: 12px; overflow: hidden;
        }
        .cg-bar     {
          height: 100%; background: #000000; border-radius: 999px;
          width: 100%;
          transition: width 1s linear;
        }
        .cg-btns    { display: flex; flex-wrap: wrap; gap: 8px; }
        button {
          border: none; border-radius: 999px; padding: 10px 12px;
          font: 12px/1.33 system-ui, sans-serif; font-weight: 500; cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .cg-always {
          background: #000000; color: #ffffff;
        }
        .cg-always:hover { background: #1a1a1a; }
        .cg-always:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
        .cg-skip   {
          background: #ffffff; color: #000000; border: 1px solid #000000;
        }
        .cg-skip:hover { background: #e2e2e2; }
        .cg-skip:focus-visible { outline: 2px solid #000; outline-offset: 2px; }
      `;

      const toast     = document.createElement('div');
      toast.className = 'cg-toast';
      toast.innerHTML = `
        <div class="cg-header"><span>\u{1F36A}</span><span class="cg-title">Cookie Guardian</span></div>
        <div class="cg-host">${hostname}</div>
        <div class="cg-body">Cookie banner detected — handling in <b class="cg-count">${seconds}</b>s</div>
        <div class="cg-bar-bg"><div class="cg-bar"></div></div>
        <div class="cg-btns">
          <button class="cg-always">Always trust</button>
          <button class="cg-skip">Cancel</button>
        </div>
      `;

      sr.appendChild(style);
      sr.appendChild(toast);
      document.body.appendChild(host);

      const cleanup   = () => { try { document.body.removeChild(host); } catch (_) {} };
      const countEl   = sr.querySelector('.cg-count');
      const bar       = sr.querySelector('.cg-bar');
      let remaining   = seconds;

      // Two nested rAFs: the outer one lets the browser paint the initial
      // width:100% state; the inner one then triggers the transition to 0%.
      // A single rAF collapses both writes into one frame, killing the animation.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.transition = `width ${seconds}s linear`;
          bar.style.width      = '0%';
        });
      });

      const ticker = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(ticker);
          cleanup();
          resolve('proceed');
        }
      }, 1000);

      sr.querySelector('.cg-always').addEventListener('click', () => {
        clearInterval(ticker); cleanup(); resolve('always');
      });
      sr.querySelector('.cg-skip').addEventListener('click', () => {
        clearInterval(ticker); cleanup(); resolve('skip');
      });
    });
  }

  /**
   * Memoised per page-load: resolves true (proceed) or false (skip).
   * Used only by the generic heuristic path — CMP Dictionary matches bypass
   * this entirely, so there is zero friction on known CMP platforms.
   *
   * If firstVisitConfirm is off, or the hostname is already trusted, resolves
   * immediately (no toast shown). Otherwise shows a self-dismissing countdown
   * toast; the user only needs to act if they want to *cancel*.
   */
  function getApproval() {
    if (!_domainApprovalPromise) {
      _domainApprovalPromise = (async () => {
        if (!settings.firstVisitConfirm) return true;
        const trusted = await getTrustedDomains();
        if (trusted.has(location.hostname)) return true;
        const answer = await showCountdownToast(location.hostname);
        if (answer === 'always') await trustDomain(location.hostname);
        return answer !== 'skip';   // 'proceed' and 'always' both mean go ahead
      })();
    }
    return _domainApprovalPromise;
  }

  /**
   * Fire the full synthetic event chain so React/Vue/Angular listeners fire.
   *
   * Guards against two reload-loop vectors:
   *   A) <a href="/real-path"> — calling .click() would navigate; we dispatch
   *      synthetic events only (the CMP JS handles the rest) and skip .click().
   *   B) Any click that causes a page reload — tracked via sessionStorage so
   *      the next page load can detect the loop and stand down.
   */
  async function safeClick(el) {
    if (!el) return false;
    if (!isVisible(el)) {
      log('Not visible — skip:', el.tagName, el.id || getLabel(el).slice(0, 40));
      return false;
    }
    try {
      const isAnchor = el.tagName === 'A';
      const href     = isAnchor ? (el.getAttribute('href') || '') : '';
      const wouldNavigate = isAnchor && href &&
                            !href.startsWith('#') &&
                            !href.startsWith('javascript:');

      const opts = { bubbles: true, cancelable: true, view: window };
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        el.dispatchEvent(new MouseEvent(type, opts));
      }

      if (wouldNavigate) {
        log('⚠ Anchor with navigating href — skipped .click() to prevent navigation');
      } else {
        el.click?.();
      }

      const totalClicks = recordSessionClick();
      log('✓ Clicked:', el.tagName,
          el.id || el.className?.toString().slice(0, 50) || getLabel(el).slice(0, 40),
          `(session click #${totalClicks} on ${location.hostname})`);
      return true;
    } catch (err) {
      warn('Click failed:', err);
      return false;
    }
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §7  Custom element support  (efl-button, web components)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * efl-button is a custom HTML element used on some enterprise sites
   * (primarily Middle East / Turkish / regional telco/finance portals).
   * It renders its content inside a shadow root, so we must:
   *   1. Find the host <efl-button> element
   *   2. Check its text / aria attributes in the light DOM
   *   3. Dispatch the click on the host (not the inner shadow element)
   */
  function findEflButton(intent, getShadowRoots = null) {
    const hosts = deepQueryAll('efl-button, .efl-button, [is="efl-button"]', document, getShadowRoots);
    const patterns = intent === 'reject' ? REJECT_PATTERNS : ACCEPT_PATTERNS;

    for (const host of hosts) {
      // Check the host element's own text / aria
      const label = getLabel(host);
      if (patterns.some(rx => rx.test(label))) {
        log(`efl-button match: "${label}"`);
        return host;
      }
      // Also check inside its shadow root if one exists
      if (host.shadowRoot) {
        const inner = host.shadowRoot.querySelector('button, [role="button"], span');
        if (inner && patterns.some(rx => rx.test(getLabel(inner)))) {
          log(`efl-button shadow-inner match: "${getLabel(inner)}"`);
          return host; // click the host, not the inner element
        }
      }
    }
    return null;
  }

  /**
   * Scan for any other custom element patterns that might host consent UI.
   * Searches by tag-name convention: elements whose tag name contains
   * "consent", "cookie", "gdpr", or "privacy".
   */
  function findCustomConsentElements(intent) {
    const all = document.querySelectorAll('*');
    const patterns = intent === 'reject' ? REJECT_PATTERNS : ACCEPT_PATTERNS;
    const tagRx = /consent|cookie|gdpr|privacy|cmp/i;

    for (const el of all) {
      if (!tagRx.test(el.tagName)) continue;
      // Search clickable children
      const clickables = el.querySelectorAll?.('button, a, [role="button"]') ?? [];
      for (const btn of clickables) {
        if (patterns.some(rx => rx.test(getLabel(btn)))) {
          log(`Custom element match <${el.tagName.toLowerCase()}>: "${getLabel(btn)}"`);
          return btn;
        }
      }
      // Also pierce shadow roots of custom elements
      if (el.shadowRoot) {
        const shadowBtns = el.shadowRoot.querySelectorAll('button, a, [role="button"]');
        for (const btn of shadowBtns) {
          if (patterns.some(rx => rx.test(getLabel(btn)))) {
            log(`Custom element shadow match: "${getLabel(btn)}"`);
            return btn;
          }
        }
      }
    }
    return null;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §8  Multilingual heuristic scorer
  // ══════════════════════════════════════════════════════════════════════════

  const CLICKABLE_SEL = [
    'button', 'a[href]', 'a:not([href])',
    'input[type="button"]', 'input[type="submit"]',
    '[role="button"]', '[tabindex="0"]',
  ].join(',');

  /** True for <a> with an href that would navigate (same idea as safeClick). */
  function isUnsafeHeuristicAnchor(el) {
    if (!el || el.tagName !== 'A') return false;
    const href = el.getAttribute('href') || '';
    return !!href && !href.startsWith('#') && !href.startsWith('javascript:');
  }

  function collectClickables(root, opts = {}, getShadowRoots = null) {
    const rejectNav = opts.rejectNavAnchors === true;
    const els = deepQueryAll(CLICKABLE_SEL, root, getShadowRoots);
    return els.filter(el => {
      if (rejectNav && isUnsafeHeuristicAnchor(el)) return false;
      const l = getLabel(el);
      return l.length > 0 && l.length < 120;
    });
  }

  function scoreAgainst(label, patterns) {
    let score = 0;
    for (const rx of patterns) {
      if (rx.test(label)) score += rx.source.startsWith('^') ? 12 : 7;
    }
    return score;
  }

  /**
   * Full heuristic pass:
   *   1. Score all clickable elements against pattern bank (fast O(n) pass)
   *   2. XPath fallback per key phrase  (if pass 1 scores nothing)
   *   3. efl-button scan
   *   4. Custom element scan
   *
   * opts.rejectNavAnchors — exclude <a href="http…"> from scoring/XPath (avoids SERP/article links).
   * opts.skipEflCustom     — skip passes 3–4 (used when root is a tight overlay subtree).
   */
  function findByHeuristic(intent, root = document, opts = {}, getShadowRoots = null) {
    const rejectNav  = opts.rejectNavAnchors === true;
    const skipGlobal = opts.skipEflCustom === true;
    const patterns   = intent === 'reject' ? REJECT_PATTERNS : ACCEPT_PATTERNS;
    const xpathTerms = intent === 'reject' ? REJECT_XPATH    : ACCEPT_XPATH;
    const THRESHOLD  = 7;

    // Pass 1 — score-based
    const candidates = collectClickables(root, { rejectNavAnchors: rejectNav }, getShadowRoots);
    log(`Heuristic: ${candidates.length} clickables, intent="${intent}"`);
    let best = null, bestScore = 0;
    for (const el of candidates) {
      const s = scoreAgainst(getLabel(el), patterns);
      if (s > bestScore) { bestScore = s; best = el; }
    }
    if (best && bestScore >= THRESHOLD) {
      log(`Score match (${bestScore}): "${getLabel(best)}"`);
      return best;
    }

    // Pass 2 — XPath text search
    const xCtx = (root === document) ? document.body : root;
    for (const term of xpathTerms) {
      const el = rejectNav ? xpathTextFirstSafe(term, xCtx) : xpathText(term, xCtx);
      if (el && isVisible(el)) { log(`XPath: "${term}" →`, getLabel(el)); return el; }
    }

    if (skipGlobal) return null;

    // Pass 3 — efl-button custom element
    const efl = findEflButton(intent, getShadowRoots);
    if (efl) return efl;

    // Pass 4 — other custom consent elements
    const custom = findCustomConsentElements(intent);
    if (custom) return custom;

    return null;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §9  Iframe scanning helper
  //     For CMPs that render inside an iframe (Termly, some TrustArc builds).
  //     Only same-origin iframes are accessible; cross-origin will throw.
  // ══════════════════════════════════════════════════════════════════════════

  async function scanIframes(intent) {
    const frames = Array.from(document.querySelectorAll('iframe'));
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc || !doc.body) continue;

        // Try all CMP profile selectors inside accessible iframes
        for (const profile of CMP_DICTIONARY) {
          const target = intent === 'reject' ? profile.reject : profile.accept;
          for (const sel of target) {
            try {
              const btn = doc.querySelector(sel);
              if (btn && isVisible(btn)) {
                log(`iframe CMP "${profile.name}" match: "${getLabel(btn).slice(0, 40)}"`);
                return btn;
              }
            } catch (_) {}
          }
        }

        // Heuristic inside iframe (separate shadow-root cache per iframe document)
        const iframeGsr = createShadowRootCache();
        const el = findByHeuristic(intent, doc.body, {}, iframeGsr);
        if (el) { log('iframe heuristic match'); return el; }
      } catch (_) { /* cross-origin — skip silently */ }
    }
    return null;
  }

  /**
   * Scan iframes specifically inside a container element.
   * Used for CMPs like Sourcepoint that render inside an iframe within their container.
   */
  async function scanContainerIframes(containerEl, intent, profile) {
    if (!containerEl) return null;
    const frames = Array.from(containerEl.querySelectorAll('iframe'));
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc || !doc.body) continue;

        // Try profile-specific selectors first
        if (profile) {
          const target = intent === 'reject' ? profile.reject : profile.accept;
          for (const sel of target) {
            try {
              const btn = doc.querySelector(sel);
              if (btn && isVisible(btn)) {
                log(`container-iframe "${profile.name}" match: "${getLabel(btn).slice(0, 40)}"`);
                return btn;
              }
            } catch (_) {}
          }
        }

        // Heuristic inside iframe
        const iframeGsr = createShadowRootCache();
        const el = findByHeuristic(intent, doc.body, {}, iframeGsr);
        if (el) { log('container-iframe heuristic match'); return el; }
      } catch (_) { /* cross-origin — skip silently */ }
    }
    return null;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §10  CMP-profile handler
  // ══════════════════════════════════════════════════════════════════════════

  // Per-hostname guard: tracks which profile manage buttons have already been
  // clicked. Prevents infinite loops where clicking manage opens a panel whose
  // content never exposes a standard reject selector, causing every subsequent
  // polling pass to click manage again (toggle open→close→open endlessly).
  const _managedClickedKeys = new Set();

  async function handleProfile(profile, getShadowRoots) {
    // Detect container presence (light DOM + shadow pierce)
    const containerFound = profile.containers.some(sel => {
      try { return !!deepQuery(sel, document, getShadowRoots); } catch (_) { return false; }
    });
    if (!containerFound) return false;

    const sr   = getProfileShadowRoot(profile);
    const want = settings.preference;
    log(`Matched: ${profile.name}${sr ? ' [shadow]' : ''}`);

    const primary = want === 'reject' ? profile.reject : profile.accept;

    // ── Direct button hit ────────────────────────────────────────────────
    const btn = queryFirst(primary, document, sr, getShadowRoots);
    if (btn) {
      log(`${profile.name}: direct → "${getLabel(btn)}"`);
      return await safeClick(btn);
    }

    // ── Two-step: open manage/preferences → then reject ──────────────────
    if (want === 'reject' && profile.manage) {
      const manageGuardKey = `${profile.name}@${location.hostname}`;
      const manageAlreadyClicked = _managedClickedKeys.has(manageGuardKey);

      // If manage was already opened this session, skip clicking it again to
      // avoid the open→close→open loop. Still try to find buttons.
      if (!manageAlreadyClicked) {
        const manageBtn = queryFirst(profile.manage, document, sr, getShadowRoots);
        if (manageBtn) {
          log(`${profile.name}: opening manage panel…`);
          _managedClickedKeys.add(manageGuardKey);
          await safeClick(manageBtn);
          await delay(profile.postClick ?? 800);
        }
      }

      const newSr  = getProfileShadowRoot(profile);
      const reject = queryFirst(profile.reject, document, newSr ?? sr, getShadowRoots);
      if (reject) {
        log(`${profile.name}: panel reject → "${getLabel(reject)}"`);
        await safeClick(reject);
        // Second pass: some CMPs show a confirmation/secondary panel after the
        // first reject click (e.g. TrustArc on Audible/EA, Danske Bank).
        // Wait briefly then look for another actionable reject target.
        await delay(700);
        const confirm = queryFirst(profile.reject, document, newSr ?? sr, getShadowRoots);
        if (confirm && confirm !== reject && isVisible(confirm)) {
          log(`${profile.name}: secondary confirmation → "${getLabel(confirm)}"`);
          await safeClick(confirm);
        } else {
          const hRoot = newSr ?? sr ?? document;
          const hConfirm = findByHeuristic('reject', hRoot, {}, getShadowRoots);
          if (hConfirm && hConfirm !== reject && isVisible(hConfirm)) {
            log(`${profile.name}: secondary heuristic confirm → "${getLabel(hConfirm)}"`);
            await safeClick(hConfirm);
          }
        }
        return true;
      }

      // Heuristic inside the panel
      const panelRoot = newSr ?? sr ?? document;
      const h = findByHeuristic('reject', panelRoot, {}, getShadowRoots);
      if (h) {
        await safeClick(h);
        // After clicking a heuristic element (e.g. a per-category radio button),
        // wait briefly then look for a higher-priority reject or a finalize button
        // so the panel is properly dismissed (e.g. Didomi "Tout refuser" / "Enregistrer").
        await delay(700);
        const h2 = findByHeuristic('reject', panelRoot, {}, getShadowRoots);
        if (h2 && h2 !== h && isVisible(h2)) {
          log(`${profile.name}: secondary heuristic panel → "${getLabel(h2)}"`);
          await safeClick(h2);
        } else if (profile.manageFinalize) {
          const finalizeBtn = queryFirst(profile.manageFinalize, document, newSr ?? sr, getShadowRoots);
          if (finalizeBtn && finalizeBtn !== h && isVisible(finalizeBtn)) {
            log(`${profile.name}: heuristic finalize panel → "${getLabel(finalizeBtn)}"`);
            await safeClick(finalizeBtn);
          }
        }
        return true;
      }

      // No reject found in the panel. Try profile-specific finalize buttons
      // (e.g. TrustArc preference-center "Submit" button that saves the current
      // selection — which defaults to necessary-only on most sites).
      if (profile.manageFinalize) {
        const finalizeBtn = queryFirst(profile.manageFinalize, document, newSr ?? sr, getShadowRoots);
        if (finalizeBtn) {
          log(`${profile.name}: finalize panel → "${getLabel(finalizeBtn)}"`);
          await safeClick(finalizeBtn);
          return true;
        }
      }

      // Manage was clicked (or attempted) but no action was possible inside the
      // panel. Return true so the polling loop stops and doesn't re-click manage.
      if (_managedClickedKeys.has(manageGuardKey)) return true;
    }

    // ── Heuristic within detected container ──────────────────────────────
    const containerEl = profile.containers.reduce((found, sel) => {
      if (found) return found;
      try { return deepQuery(sel, document, getShadowRoots); } catch (_) { return null; }
    }, null);
    if (containerEl) {
      const h = findByHeuristic(want, containerEl, {}, getShadowRoots);
      if (h) return await safeClick(h);

      // Scan iframes within the container (Sourcepoint renders inside iframes)
      if (profile.scanIframe) {
        const iframeBtn = await scanContainerIframes(containerEl, want, profile);
        if (iframeBtn) return await safeClick(iframeBtn);
      }
    }

    return false;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §11  Generic heuristic handler
  //      Runs when no known CMP profile matched.
  // ══════════════════════════════════════════════════════════════════════════

  /** Major SERPs — generic body-text + XPath false-positive on snippets (see plan). */
  function isSearchEngineResultsPage() {
    const host = location.hostname.replace(/^www\./, '');
    const path = location.pathname;
    const q = location.search;

    if (/(^|\.)google\./i.test(location.hostname) && path.startsWith('/search')) return true;
    if (host === 'bing.com' && path.startsWith('/search')) return true;
    if (host === 'duckduckgo.com' && (path === '/' || path === '') && /[?&]q=/.test(q)) return true;
    if (host === 'search.yahoo.com') return true;
    if (host === 'yahoo.com' && path.startsWith('/search')) return true;
    if (host === 'ecosia.org' && path.startsWith('/search')) return true;
    if (host === 'startpage.com' && path.startsWith('/sp/search')) return true;
    if (location.hostname === 'search.brave.com' && path.startsWith('/search')) return true;
    return false;
  }

  function intersectsLowerViewport(el, fraction) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const line = vh * fraction;
    return r.bottom > line && r.top < vh - 8;
  }

  /** Drop overlay nodes that are ancestors of another candidate (prefer innermost). */
  function dedupeOverlayAncestors(nodes) {
    const arr = [...nodes];
    return arr.filter(el => !arr.some(other => other !== el && el.contains(other)));
  }

  /**
   * Fixed/sticky layers in the lower viewport + cookie-ish dialogs.
   * Used when only the body-text gate matched (no banner selectors).
   */
  function gatherLikelyCookieOverlays() {
    const roots = new Set();
    try {
      const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]');
      for (const d of dialogs) {
        if (isVisible(d)) roots.add(d);
      }
      const vh = window.innerHeight;
      const all = document.body ? document.body.getElementsByTagName('*') : [];
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        let style;
        try { style = window.getComputedStyle(el); } catch (_) { continue; }
        const pos = style.position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        if (!isVisible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 64 || r.height < 20) continue;
        if (!intersectsLowerViewport(el, 0.45)) continue;
        const z = parseInt(style.zIndex, 10);
        if (pos === 'fixed' && (r.bottom >= vh * 0.35 || (!Number.isNaN(z) && z >= 50))) {
          roots.add(el);
        } else if (pos === 'sticky') {
          roots.add(el);
        }
      }
    } catch (_) {}
    return dedupeOverlayAncestors(roots);
  }

  async function handleGeneric(getShadowRoots) {
    if (isSearchEngineResultsPage()) {
      log('Generic: skip — search engine results page');
      return false;
    }

    // Banner fingerprints — only selectors specific to cookie/consent UI.
    // Removed overly broad selectors (fixed-bottom overlays, generic dialogs)
    // that caused false positives on hotel booking bars, chat widgets, etc.
    const bannerSels = [
      '[id*="cookie"][id*="banner"]',   '[id*="cookie"][id*="consent"]',
      '[id*="cookie"][id*="notice"]',   '[id*="cookie"][id*="popup"]',
      '[id*="gdpr"]',                    '[id*="privacy-banner"]',
      '[class*="cookie-banner"]',        '[class*="cookie-notice"]',
      '[class*="cookie-consent"]',       '[class*="cookie-popup"]',
      '[class*="consent-banner"]',       '[class*="consent-notice"]',
      '[class*="gdpr-banner"]',
      '[aria-label*="cookie" i]',        '[aria-label*="consent" i]',
      '[aria-describedby*="cookie" i]',
      // Dialogs only when their label explicitly mentions cookies/consent
      '[role="dialog"][aria-label*="cookie" i]',
      '[role="dialog"][aria-label*="consent" i]',
      '[role="dialog"][aria-label*="privacy" i]',
      '[role="alertdialog"][aria-label*="cookie" i]',
    ];

    let bannerRoot = null;
    let usedBodyTextGateOnly = false;
    for (const sel of bannerSels) {
      try {
        const el = deepQuery(sel, document, getShadowRoots);
        if (el && isVisible(el)) { bannerRoot = el; break; }
      } catch (_) {}
    }

    if (!bannerRoot) {
      // Text-presence gate: require consent-specific phrases, not bare
      // keywords like "cookie" or "çerez" which match food/hospitality sites
      // (e.g. kahvedunyasi.com sells çerez, hilton.com mentions cookies).
      // Covers all 21 supported languages: EN TR DE FR ES IT NL PT PL SV NO DA FI CS SK EL RO HU JA KO ZH
      const bodyText = (document.body?.innerText || '').toLowerCase();
      const relevant =
        // ── Unambiguous privacy/consent terms (any language) ──────
        bodyText.includes('gdpr') ||

        // ── English ──────────────────────────────────────────────
        /cookie\s*(policy|notice|banner|consent|settings|preferences)/i.test(bodyText) ||
        /\b(we|this\s+site|this\s+website)\s+use[sd]?\s+cookies?\b/i.test(bodyText) ||
        /\buse[sd]?\s+cookies?\s+(to|for|in\s+order)\b/i.test(bodyText) ||

        // ── Turkish ──────────────────────────────────────────────
        /çerez\s*(politikası|ayarları|tercih|bildirimi|kullan)/i.test(bodyText) ||

        // ── German ───────────────────────────────────────────────
        bodyText.includes('datenschutz') ||
        bodyText.includes('privatsphäre') ||
        /cookie[\s-]*(richtlinie|hinweis|einstellung)/i.test(bodyText) ||
        /wir\s+verwenden\s+cookies/i.test(bodyText) ||

        // ── French ───────────────────────────────────────────────
        /utilisons?\s+des?\s+cookies?/i.test(bodyText) ||
        bodyText.includes('choix de cookies') ||
        bodyText.includes('politique de cookies') ||

        // ── Spanish ──────────────────────────────────────────────
        bodyText.includes('política de cookies') ||
        bodyText.includes('aviso de cookies') ||
        /utilizamos\s+cookies/i.test(bodyText) ||
        /usamos\s+cookies/i.test(bodyText) ||

        // ── Italian ──────────────────────────────────────────────
        /informativa\s+sui\s+cookie/i.test(bodyText) ||
        /politica\s+sui\s+cookie/i.test(bodyText) ||
        /utilizziamo\s+(i\s+)?cookie/i.test(bodyText) ||

        // ── Dutch ────────────────────────────────────────────────
        bodyText.includes('cookiebeleid') ||
        bodyText.includes('cookiemelding') ||
        /wij\s+gebruiken\s+cookies/i.test(bodyText) ||

        // ── Portuguese ───────────────────────────────────────────
        bodyText.includes('aviso de cookies') ||
        /usamos\s+cookies/i.test(bodyText) ||

        // ── Polish ───────────────────────────────────────────────
        /polityka\s+(plików\s+)?cookie/i.test(bodyText) ||
        /używamy\s+(plików\s+)?cookie/i.test(bodyText) ||
        /stosujemy\s+pliki\s+cookie/i.test(bodyText) ||

        // ── Swedish ──────────────────────────────────────────────
        bodyText.includes('cookiepolicy') ||
        /vi\s+använder\s+(cookies|kakor)/i.test(bodyText) ||
        bodyText.includes('kakpolicy') ||

        // ── Norwegian ────────────────────────────────────────────
        bodyText.includes('informasjonskapsler') ||
        /vi\s+bruker\s+(informasjons)?cookies/i.test(bodyText) ||

        // ── Danish ───────────────────────────────────────────────
        bodyText.includes('cookiepolitik') ||
        /vi\s+bruger\s+cookies/i.test(bodyText) ||

        // ── Finnish ──────────────────────────────────────────────
        bodyText.includes('evästekäytäntö') ||
        bodyText.includes('evästeseloste') ||
        /käytämme\s+evästeitä/i.test(bodyText) ||

        // ── Czech ────────────────────────────────────────────────
        /používáme\s+(soubory\s+)?cookie/i.test(bodyText) ||
        /zásady\s+používání\s+cookie/i.test(bodyText) ||

        // ── Slovak ───────────────────────────────────────────────
        /používame\s+(súbory\s+)?cookie/i.test(bodyText) ||
        /zásady\s+používania\s+cookie/i.test(bodyText) ||

        // ── Greek ────────────────────────────────────────────────
        /πολιτική\s+cookie/i.test(bodyText) ||
        /χρησιμοποιούμε\s+cookies/i.test(bodyText) ||

        // ── Romanian ─────────────────────────────────────────────
        /politica\s+de\s+cookie/i.test(bodyText) ||
        /utilizăm\s+cookie/i.test(bodyText) ||

        // ── Hungarian ────────────────────────────────────────────
        /cookie\s+szabályzat/i.test(bodyText) ||
        /süti(ket|t)?\s+(szabályzat|használ)/i.test(bodyText) ||

        // ── Japanese ─────────────────────────────────────────────
        bodyText.includes('クッキーポリシー') ||
        bodyText.includes('クッキーを使用') ||
        /cookieの(使用|利用)/i.test(bodyText) ||

        // ── Korean ───────────────────────────────────────────────
        bodyText.includes('쿠키 정책') ||
        bodyText.includes('쿠키를 사용') ||
        bodyText.includes('쿠키 사용') ||

        // ── Chinese ──────────────────────────────────────────────
        /cookie\s*政策/i.test(bodyText) ||
        /使用\s*cookie/i.test(bodyText) ||
        bodyText.includes('隐私政策') ||

        // ── "consent" paired with cookie/privacy context (any language)
        (/\bconsent\b/.test(bodyText) && (
          bodyText.includes('cookie') || bodyText.includes('privacy') ||
          bodyText.includes('tracking') || bodyText.includes('çerez')
        ));
      if (!relevant) return false;
      bannerRoot = document.body;
      usedBodyTextGateOnly = true;
      log('Generic: body-text gate passed (consent phrases detected)');
    }

    log('Generic: root =', bannerRoot.tagName, bannerRoot.id || '');

    const overlayHeuristicOpts = { skipEflCustom: true, rejectNavAnchors: true };

    if (usedBodyTextGateOnly) {
      const overlays = gatherLikelyCookieOverlays();
      if (!overlays.length) {
        log('Generic: body-text gate but no overlay/dialog candidate — skip');
        return false;
      }
      // First-visit confirmation gate — only on the heuristic path.
      if (!await getApproval()) {
        log('First-visit confirmation: user cancelled — leaving banner untouched');
        return false;
      }
      for (const sub of overlays) {
        const el = findByHeuristic(settings.preference, sub, overlayHeuristicOpts, getShadowRoots);
        if (el) return await safeClick(el);
      }
      const iframeEl = await scanIframes(settings.preference);
      if (iframeEl) return await safeClick(iframeEl);
      return false;
    }

    // First-visit confirmation gate — only on the heuristic path.
    if (!await getApproval()) {
      log('First-visit confirmation: user cancelled — leaving banner untouched');
      return false;
    }

    const el = findByHeuristic(settings.preference, bannerRoot, {}, getShadowRoots);
    if (el) return await safeClick(el);

    // Also scan iframes as last resort
    const iframeEl = await scanIframes(settings.preference);
    if (iframeEl) return await safeClick(iframeEl);

    return false;
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §12  Main orchestrator
  //
  //  Preference routing:
  //    'reject'   → always seek reject button only
  //    'accept'   → always seek accept button only
  //    'moderate' → seek reject button for MODERATE_REJECT_TRIES passes;
  //                 if none found by then, fall back to accept so the banner
  //                 is cleared even on sites that have no reject option.
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Resolve which effective preference to use on this particular pass.
   * In 'moderate' mode this evolves over time:
   *   passes 0 … MODERATE_REJECT_TRIES-1  → treat as 'reject'
   *   passes MODERATE_REJECT_TRIES +       → treat as 'accept' (fallback)
   */
  function resolveEffectivePref() {
    if (settings.preference !== 'moderate') return settings.preference;

    if (moderateRejectAttempts < MODERATE_REJECT_TRIES) {
      return 'reject';   // still in the reject-seeking window
    }

    // Fallback phase — log once
    if (!moderateFallingBack) {
      moderateFallingBack = true;
      log(`Moderate mode: no reject found after ${MODERATE_REJECT_TRIES} attempts — falling back to accept`);
    }
    return 'accept';
  }

  async function loadHostHints() {
    return new Promise(resolve => {
      chrome.storage.local.get({ [HOST_HINTS_KEY]: {} }, s => {
        hostHints = s[HOST_HINTS_KEY] || {};
        hostHintsLoaded = true;
        resolve();
      });
    });
  }

  /** Persist which dismissal path last succeeded for this hostname (device-local only). */
  function persistHostDismissalHint(payload) {
    const host = location.hostname;
    chrome.storage.local.get({ [HOST_HINTS_KEY]: {} }, s => {
      const next = { ...(s[HOST_HINTS_KEY] || {}), [host]: { ...payload, v: 1, ts: Date.now() } };
      hostHints = next;
      chrome.storage.local.set({ [HOST_HINTS_KEY]: next });
    });
  }

  /**
   * @param {function} getShadowRoots — from createShadowRootCache(); required for perf.
   */
  async function attemptHandle(getShadowRoots) {
    if (handled || !settings.enabled) return;
    if (!getShadowRoots) getShadowRoots = createShadowRootCache();

    const effectivePref = resolveEffectivePref();

    // When in moderate mode and still in the reject-seeking phase, run a
    // dedicated, lightweight check first (fast path before full profile scan).
    // This avoids burning retries on unrelated DOM activity.
    if (settings.preference === 'moderate' && effectivePref === 'reject') {
      moderateRejectAttempts++;
      log(`Moderate: reject-seek pass ${moderateRejectAttempts}/${MODERATE_REJECT_TRIES}`);
    }

    // Temporarily override settings.preference so all downstream functions
    // (handleProfile, handleGeneric, findByHeuristic) use the resolved value.
    const savedPref = settings.preference;
    if (settings.preference === 'moderate') settings.preference = effectivePref;

    try {
      // ⓪ Per-host hint — one narrow try per page load, then full pipeline
      if (!hostHintFastPathTried) {
        hostHintFastPathTried = true;
        if (!hostHintsLoaded) await loadHostHints();
        const hint = hostHints[location.hostname];
        if (hint && hint.v === 1) {
          log('Host hint fast path:', hint);
          try {
            let ok = false;
            if (hint.kind === 'cmp' && hint.profile) {
              const prof = CMP_DICTIONARY.find(p => p.name === hint.profile);
              if (prof) ok = await handleProfile(prof, getShadowRoots);
            } else if (hint.kind === 'generic') {
              ok = await handleGeneric(getShadowRoots);
            }
            if (ok) {
              persistHostDismissalHint(
                hint.kind === 'cmp'
                  ? { kind: 'cmp', profile: hint.profile }
                  : { kind: 'generic' },
              );
              markHandled();
              return;
            }
          } catch (err) { warn('Host hint fast path:', err); }
        }
      }

      // ① Known CMP profiles (fast, precise)
      for (const profile of CMP_DICTIONARY) {
        try {
          if (await handleProfile(profile, getShadowRoots)) {
            persistHostDismissalHint({ kind: 'cmp', profile: profile.name });
            markHandled();
            return;
          }
        } catch (err) { warn(`Profile "${profile.name}":`, err); }
      }

      // ② Generic multilingual heuristic (broad)
      try {
        if (await handleGeneric(getShadowRoots)) {
          persistHostDismissalHint({ kind: 'generic' });
          markHandled();
          return;
        }
      } catch (err) { warn('Generic handler:', err); }

    } finally {
      // Always restore the real preference before returning
      settings.preference = savedPref;
    }
  }

  async function runDetectionPass() {
    if (handled || !settings.enabled) return;
    const getShadowRoots = createShadowRootCache();
    await attemptHandle(getShadowRoots);
    attachToNewShadowRoots(getShadowRoots);
  }

  function markHandled() {
    handled = true;
    stopPolling();
    stopObserver();
    // NOTE: Do NOT clearSessionGuard() here. If this click causes a page
    // reload, the guard must persist so the next load can detect the loop.
    // The guard expires naturally after GUARD_WINDOW_MS (30 s) and is
    // explicitly cleared only when the user changes settings via the popup.
    log('Banner dismissed ✓');
    try { chrome.runtime.sendMessage({ type: 'BANNER_HANDLED' }).catch(() => {}); } catch (_) {}
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §13  Persistent MutationObserver  (shadow-aware, self-reattaching)
  //
  //  One observer on document.body  → catches light-DOM injections.
  //  Additional observers on each shadow root discovered during scans.
  //  All observers share a single debounced handler to avoid call floods.
  //  When mutations occur, we also re-scan for new shadow roots.
  // ══════════════════════════════════════════════════════════════════════════

  function onMutation() {
    if (handled) { stopObserver(); return; }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try { await runDetectionPass(); } catch (err) { warn('runDetectionPass:', err); }
    }, DEBOUNCE_MS);
  }

  function attachObserverTo(root) {
    if (!root || observedShadowRoots.has(root)) return;
    observedShadowRoots.add(root);
    const obs = new MutationObserver(onMutation);
    obs.observe(root, {
      childList:  true,
      subtree:    true,
      attributes: false,           // attributes not needed and very noisy
    });
    activeObservers.add(obs);
    log('Observing', root === document.body ? 'document.body' : 'a shadow root');
  }

  function attachToNewShadowRoots(getShadowRoots = null) {
    const roots = getShadowRoots ? getShadowRoots(document) : collectShadowRoots(document);
    for (const sr of roots) {
      if (!observedShadowRoots.has(sr)) attachObserverTo(sr);
    }
  }

  function startObserver() {
    if (!document.body) {
      // Body not ready yet — defer
      setTimeout(startObserver, 100);
      return;
    }
    attachObserverTo(document.body);
    attachToNewShadowRoots();
    log('MutationObserver system ready');
  }

  function stopObserver() {
    clearTimeout(debounceTimer);
    for (const obs of activeObservers) obs.disconnect();
    activeObservers.clear();
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §14  Polling fallback
  //      Runs every 500 ms for up to MAX_RETRY attempts.
  //      Belt-and-suspenders for sites that use document.write,
  //      isolated iframes, or async script loaders the observer misses.
  // ══════════════════════════════════════════════════════════════════════════

  function startPolling() {
    pollingTimer = setInterval(async () => {
      if (handled || retryCount >= MAX_RETRY) {
        stopPolling();
        return;
      }
      retryCount++;
      await runDetectionPass();
    }, 500);
    log(`Polling started (max ${MAX_RETRY} × 500 ms = ${MAX_RETRY * 500 / 1000} s)`);
  }

  function stopPolling() {
    clearInterval(pollingTimer);
    log(`Polling stopped (retries used: ${retryCount}/${MAX_RETRY})`);
  }


  // ══════════════════════════════════════════════════════════════════════════
  // §15  Settings sync & initialisation
  // ══════════════════════════════════════════════════════════════════════════

  async function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.sync.get(
        { preference: 'moderate', enabled: true, showNotifications: true, debugMode: false, firstVisitConfirm: false },
        stored => { Object.assign(settings, stored); resolve(); }
      );
    });
  }

  // Live updates from the popup
  chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === 'WHITELIST_UPDATED') {
      pageWhitelisted = await isWhitelisted();
      if (pageWhitelisted) {
        log(`Whitelist: ${location.hostname} added — halting`);
        stopObserver();
        stopPolling();
        handled = true;
      } else if (settings.enabled) {
        log(`Whitelist: ${location.hostname} removed — re-arming`);
        handled                = false;
        retryCount             = 0;
        moderateRejectAttempts = 0;
        moderateFallingBack    = false;
        hostHintFastPathTried  = false;
        _domainApprovalPromise = null;
        clearSessionGuard();
        startObserver();
        startPolling();
        await runDetectionPass();
      }
      return;
    }

    if (msg.type !== 'SETTINGS_UPDATED' || !msg.settings) return;
    const wasDisabled = !settings.enabled;
    Object.assign(settings, msg.settings);
    log('Settings updated live:', settings);
    if (settings.enabled && !pageWhitelisted && (wasDisabled || handled)) {
      // Re-arm: allow the extension to act again on this tab
      handled                = false;
      retryCount             = 0;
      moderateRejectAttempts = 0;   // reset moderate-reject counter
      moderateFallingBack    = false;
      hostHintFastPathTried  = false;
      _domainApprovalPromise = null; // re-evaluate trust on next click attempt
      clearSessionGuard();           // allow fresh attempts after user action
      startObserver();
      startPolling();
      await runDetectionPass();
    } else if (!settings.enabled) {
      // Extension was turned off — immediately halt all active monitoring
      stopObserver();
      stopPolling();
      log('Disabled — monitoring stopped');
    }
  });

  function getTabContext() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_TAB_CONTEXT' }, response => {
        resolve(response?.incognito ?? false);
      });
    });
  }

  async function init() {
    await loadSettings();

    if (!settings.enabled) {
      log('Disabled — standing by');
      return;   // still listens for SETTINGS_UPDATED to re-arm
    }

    await loadHostHints();

    const isPrivate = await getTabContext();
    activeWlKey = isPrivate ? WL_KEY_PRIVATE : WL_KEY_NORMAL;
    log(`Context: ${isPrivate ? 'InPrivate' : 'Normal'} — using key "${activeWlKey}"`);

    pageWhitelisted = await isWhitelisted();
    if (pageWhitelisted) {
      log(`Whitelisted — skipping ${location.hostname}`);
      return;   // still listens for WHITELIST_UPDATED to re-arm
    }

    // Reload-loop guard: if we've already clicked multiple times on this
    // hostname within the guard window, our clicks are likely causing
    // page reloads (false positive). Stand down to break the loop.
    const priorClicks = getSessionClicks();
    if (priorClicks >= MAX_SESSION_CLICKS) {
      log(`⚠ Reload-loop guard: ${priorClicks} clicks on ${location.hostname} within ${GUARD_WINDOW_MS / 1000}s — standing down`);
      handled = true;
      return;
    }

    log(`Ready | pref="${settings.preference}" | ${location.hostname}`);

    // ① Immediate pass — catches banners already in DOM at document_idle
    await runDetectionPass();

    if (!handled) {
      startObserver();   // ② DOM mutation watch (light + shadow)
      startPolling();    // ③ Belt-and-suspenders polling
    }
  }

  // Kick off
  init();

})();
