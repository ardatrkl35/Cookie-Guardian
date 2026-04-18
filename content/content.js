(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // shared/hostname.js
  var require_hostname = __commonJS({
    "shared/hostname.js"(exports, module) {
      var HOSTNAME_MAX_LENGTH = 253;
      var FQDN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})*$/;
      var IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
      var IPV6_RE = /^\[?[a-f0-9:]+\]?$/;
      function normalizeHostname3(input) {
        const raw = String(input || "").trim().toLowerCase();
        if (!raw) return null;
        if (/[<>"'`&]/.test(raw)) return null;
        let host;
        try {
          host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
        } catch {
          return null;
        }
        host = host.replace(/\.$/, "");
        if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
        if (host.startsWith("www.")) host = host.slice(4);
        if (!host || host.length > HOSTNAME_MAX_LENGTH) return null;
        if (!FQDN_RE.test(host) && !IPV4_RE.test(host) && !IPV6_RE.test(host) && host !== "localhost") {
          return null;
        }
        return host;
      }
      function hostsMatch2(a, b) {
        const na = normalizeHostname3(a);
        const nb = normalizeHostname3(b);
        if (!na || !nb) return false;
        return na === nb;
      }
      function isSubdomainOf(sub, parent) {
        const ns = normalizeHostname3(sub);
        const np = normalizeHostname3(parent);
        if (!ns || !np) return false;
        return ns === np || ns.endsWith("." + np);
      }
      if (typeof module !== "undefined" && module.exports) {
        module.exports = { normalizeHostname: normalizeHostname3, hostsMatch: hostsMatch2, isSubdomainOf };
      }
    }
  });

  // content/src/orchestrator.js
  var import_hostname2 = __toESM(require_hostname());

  // data/cmp-profiles.json
  var cmp_profiles_default = {
    version: "1.0.0",
    generatedAt: "2026-04-18",
    profiles: [
      {
        name: "OneTrust",
        note: "OptanonWrapper JS function; 4+ layout variants",
        containers: [
          "#onetrust-banner-sdk",
          "#onetrust-consent-sdk",
          ".optanon-alert-box-wrapper",
          "#onetrust-accept-btn-handler"
        ],
        accept: [
          "#onetrust-accept-btn-handler",
          "button.onetrust-accept-btn-handler",
          '[class*="onetrust-accept"]'
        ],
        reject: [
          "#onetrust-reject-all-handler",
          "button.onetrust-reject-all-handler",
          ".ot-pc-refuse-all-handler",
          "#accept-recommended-btn-handler",
          "[data-optanon-btn-deny]",
          '[aria-label*="Reject"]',
          '[aria-label*="Decline"]',
          '[aria-label*="Necessary only"]'
        ],
        manage: [
          "#onetrust-pc-btn-handler",
          ".onetrust-pc-btn-handler",
          'button[class*="onetrust-pc"]'
        ],
        postClick: 900
      },
      {
        name: "OneTrust-PC",
        note: "Preference Centre modal \u2014 appears without initial banner",
        containers: [
          "#onetrust-pc-sdk",
          ".ot-sdk-container",
          "#ot-sdk-btn-floating"
        ],
        accept: [
          "#accept-recommended-btn-handler",
          ".save-preference-btn-handler"
        ],
        reject: [
          ".ot-pc-refuse-all-handler",
          "#onetrust-reject-all-handler"
        ]
      },
      {
        name: "Cookiebot",
        note: "Very static structure; adblockers target it first. Scans iframes for hosted deployments.",
        containers: [
          "#CybotCookiebotDialog",
          "#CybotCookiebotDialogBodyUnderlay",
          'div[id^="CybotCookiebot"]',
          '[aria-describedby="CybotCookiebotDialog"]',
          '[aria-modal="true"][id^="CybotCookiebot"]'
        ],
        accept: [
          "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
          "#CybotCookiebotDialogBodyButtonAccept",
          "a#CybotCookiebotDialogBodyLevelButtonAccept"
        ],
        reject: [
          "#CybotCookiebotDialogBodyButtonDecline",
          "#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll",
          'a[id*="Decline"]',
          "#CybotCookiebotDialogBodyLevelButtonAccept",
          ".button-necessary",
          'button[class*="button-necessary"]',
          'button[class*="button-decline"]'
        ],
        scanIframe: true
      },
      {
        name: "Usercentrics",
        note: "Shadow DOM \u2014 standard querySelector will not reach buttons",
        containers: [
          "#usercentrics-root"
        ],
        shadowHost: "#usercentrics-root",
        accept: [
          '[data-testid="uc-accept-all-button"]',
          'button[data-testid*="accept"]'
        ],
        reject: [
          '[data-testid="uc-deny-all-button"]',
          'button[data-testid*="deny"]',
          'button[data-testid*="reject"]'
        ]
      },
      {
        name: "Didomi",
        note: "Fixed bottom bar or centre pop-up",
        containers: [
          "#didomi-host",
          "#didomi-notice",
          ".didomi-popup-container"
        ],
        accept: [
          "#didomi-notice-agree-button",
          'button[class*="didomi-components-button--highlight"]'
        ],
        reject: [
          "#didomi-notice-disagree-button",
          'button[class*="didomi-components-button--secondary"]',
          'button[class*="didomi-components-button"][aria-label*="disagree" i]',
          'button[class*="didomi-components-button"][aria-label*="refuser" i]',
          'button[class*="sdc-disagree-button"]',
          "#didomi-notice-disagree-button-handler"
        ],
        manage: [
          ".didomi-notice-learn-more-button",
          "#didomi-notice-learn-more-button"
        ],
        postClick: 700,
        manageFinalize: [
          "#didomi-notice-disagree-button",
          'button[class*="didomi-components-button--secondary"]',
          'button[aria-label*="refuser" i]',
          'button[aria-label*="disagree" i]'
        ]
      },
      {
        name: "CookieYes",
        note: "Formerly Cookie Law Info; cli- prefix on older deployments",
        containers: [
          ".cky-consent-container",
          "#cookie-law-info-bar",
          ".cky-modal"
        ],
        accept: [
          ".cky-btn-accept",
          'button[data-cky-tag="accept-button"]',
          "#wt-cli-accept-all-btn",
          ".cli-plugin-button.cli-plugin-main-button"
        ],
        reject: [
          ".cky-btn-reject",
          'button[data-cky-tag="reject-button"]',
          "#wt-cli-reject-btn"
        ]
      },
      {
        name: "Iubenda",
        note: "Highly specific div structure, easy to fingerprint",
        containers: [
          "#iubenda-cs-banner",
          ".iubenda-cs-container"
        ],
        accept: [
          ".iubenda-cs-accept-btn",
          '[class*="iubenda-cs-accept"]'
        ],
        reject: [
          ".iubenda-cs-reject-btn",
          '[class*="iubenda-cs-reject"]'
        ]
      },
      {
        name: "Osano",
        note: "All classes begin with osano-cm- prefix",
        containers: [
          ".osano-cm-window",
          ".osano-cm-dialog",
          '[class^="osano-cm"]'
        ],
        accept: [
          ".osano-cm-accept-all",
          "button.osano-cm-button--type_accept"
        ],
        reject: [
          ".osano-cm-denyAll",
          "button.osano-cm-button--type_denyAll"
        ]
      },
      {
        name: "InMobi-Quantcast",
        note: "TCF V2; complex DOM tree; mode attribute on buttons",
        containers: [
          ".qc-cmp2-container",
          "#qc-cmp2-ui",
          "#qcCmpUi"
        ],
        accept: [
          ".qc-cmp2-summary-buttons button:last-child",
          'button.qc-cmp2-b-pbutton[mode="primary"]',
          '.qc-cmp2-b-pbutton[mode="primary"]'
        ],
        reject: [
          ".qc-cmp2-summary-buttons button:first-child",
          'button.qc-cmp2-b-pbutton[mode="secondary"]',
          '.qc-cmp2-b-pbutton[mode="secondary"]'
        ]
      },
      {
        name: "Termly",
        note: "Often inside an iframe or isolated div",
        containers: [
          "#termly-consent-banner",
          "#termly-code-snippet-support",
          ".t-consentPrompt"
        ],
        accept: [
          ".t-consentPrompt-accept",
          ".t-acceptAllButton",
          '[data-tid="banner-accept"]'
        ],
        reject: [
          ".t-consentPrompt-decline",
          '[data-tid="banner-decline"]'
        ],
        scanIframe: true
      },
      {
        name: "Axeptio",
        note: "Widget in bottom corner; axeptio_ prefix",
        containers: [
          "#axeptio_overlay",
          "#axeptio_main_button"
        ],
        accept: [
          ".axeptio_btn_acceptAll",
          "#axeptio__ButtonAccept"
        ],
        reject: [
          ".axeptio_btn_dismiss",
          "#axeptio__ButtonDecline"
        ]
      },
      {
        name: "Complianz-WP",
        note: "Directly embedded in WordPress HTML",
        containers: [
          ".cmplz-cookiebanner",
          "#cmplz-cookiebanner-container",
          ".cc-nb-main-container"
        ],
        accept: [
          ".cmplz-accept",
          "button.cc-nb-okagree"
        ],
        reject: [
          ".cmplz-deny",
          "button.cc-nb-reject"
        ]
      },
      {
        name: "Borlabs-WP",
        note: "Thick centre modal on WP sites; borlabs- prefix",
        containers: [
          "#borlabs-cookie",
          ".borlabs-cookie-box"
        ],
        accept: [
          "#borlabs-cookie .accept-all-cookies",
          "button[data-cookie-accept-all]"
        ],
        reject: [
          "#borlabs-cookie .decline-cookies",
          "button[data-cookie-refuse]"
        ]
      },
      {
        name: "TrustArc",
        note: "Legacy deployments use truste- IDs; newer use trustarc-. Two-step flows common on Audible, EA.",
        containers: [
          "#trustarc-consent-wrapper",
          "#truste-consent-track",
          "#truste-consent-content",
          ".truste_overlay",
          '[id^="pop-div"]'
        ],
        accept: [
          "#trustarc-accept-btn",
          ".te-consent-btn",
          ".pdynamicbutton .call",
          "a.trustarc-agree-btn"
        ],
        reject: [
          "#truste-consent-required",
          "button#truste-consent-required",
          ".required.btn",
          "a.trustarc-decline-btn",
          '[data-testid="cookiepref-reject"]',
          '[class*="rejectAll"]',
          '[id*="rejectAll"]',
          'button[class*="reject-all"]',
          'a[class*="reject-all"]'
        ],
        manage: [
          "#truste-show-consent",
          'a[class*="truste-button2"]'
        ],
        postClick: 1e3,
        manageFinalize: [
          '[id^="pop-div"] button[type="submit"]',
          '[id^="pop-div"] input[type="submit"]',
          '[id^="pop-div"] .pdynamicbutton',
          "#truste-pref-submit",
          '.trustarc-pref-center button[type="submit"]',
          ".pdynamicbutton button"
        ]
      },
      {
        name: "Consentmanager",
        note: "Very simple container names: cmpbox / cmpwrapper",
        containers: [
          "#cmpbox",
          "#cmpwrapper",
          ".cmpbox"
        ],
        accept: [
          ".cmpboxbtnYes",
          ".cmpboxbtn.cmpboxbtnYes",
          "#cmpwelcome .cmpboxbtn"
        ],
        reject: [
          ".cmpboxbtnno",
          ".cmpboxbtn.cmpboxbtnno"
        ]
      },
      {
        name: "GDPR-Cookie-Compliance-Moove",
        note: "Thin bar at bottom; moove-gdpr- prefix",
        containers: [
          "#moove_gdpr_cookie_info_bar",
          ".moove_gdpr_info_bar_container"
        ],
        accept: [
          ".moove-gdpr-infobar-allow-all",
          "#moove-gdpr-cookie-infobar-allow-all"
        ],
        reject: [
          ".moove-gdpr-infobar-reject-btn"
        ]
      },
      {
        name: "Cookie-Notice-Humanity",
        note: "Simplest ID structure on the market",
        containers: [
          "#cookie-notice",
          ".cookie-notice-container"
        ],
        accept: [
          "#cn-accept-cookie",
          "a.cn-set-cookie"
        ],
        reject: [
          "#cn-refuse-cookie"
        ]
      },
      {
        name: "Real-Cookie-Banner",
        note: "Uses rcb- prefix exclusively",
        containers: [
          ".rcb-cookie-banner",
          "#rcb-cookie-banner"
        ],
        accept: [
          ".rcb-btn-accept",
          'button[class*="rcb-btn-accept"]'
        ],
        reject: [
          ".rcb-btn-dismiss",
          'button[class*="rcb-btn-dismiss"]'
        ]
      },
      {
        name: "Crownpeak-Evidon",
        note: "Evidon infrastructure visible in DOM; evidon- prefix",
        containers: [
          "#evidon-banner",
          "#_evidon_banner"
        ],
        accept: [
          "#evidon-banner-acceptbutton",
          ".evidon-banner-acceptbutton"
        ],
        reject: [
          "#evidon-reject-button",
          ".evidon-banner-rejectbutton"
        ]
      },
      {
        name: "Securiti-AI",
        note: "Banner div appended to end of <body>",
        containers: [
          "#securiti-consent-banner",
          ".securiti-banner-container"
        ],
        accept: [
          ".securiti-accept-btn",
          'button[class*="securiti-accept"]'
        ],
        reject: [
          ".securiti-reject-btn"
        ]
      },
      {
        name: "DataGrail",
        note: "New-generation tool; clear, semantic class names",
        containers: [
          ".datagrail-banner-container",
          "#datagrail-banner"
        ],
        accept: [
          ".datagrail-accept-all"
        ],
        reject: [
          ".datagrail-reject-all",
          ".datagrail-deny-all"
        ]
      },
      {
        name: "Ketch",
        note: "API-focused; sometimes hides in Shadow DOM",
        containers: [
          "#ketch-smart-banner",
          ".ketch-banner",
          '[class^="ketch-"]'
        ],
        shadowHost: "#ketch-smart-banner",
        accept: [
          ".ketch-btn-accept",
          'button[class*="ketch-accept"]'
        ],
        reject: [
          ".ketch-btn-decline",
          'button[class*="ketch-decline"]'
        ]
      },
      {
        name: "Civic-UK",
        note: '"C" logo in corner on first visit; ccc- prefix',
        containers: [
          "#ccc-module",
          "#ccc",
          ".ccc-notify"
        ],
        accept: [
          "#ccc-recommended-settings",
          ".ccc-notify-accept"
        ],
        reject: [
          "#ccc-reject-settings",
          ".ccc-notify-reject"
        ]
      },
      {
        name: "Illow",
        note: "Sticky widget logic; illow- prefix",
        containers: [
          "#illow-widget-container",
          ".illow-widget"
        ],
        accept: [
          ".illow-btn-accept",
          'button[class*="illow-accept"]'
        ],
        reject: [
          ".illow-btn-reject",
          'button[class*="illow-reject"]'
        ]
      },
      {
        name: "PiwikPro-CMP",
        note: "ppms_cm_ prefix throughout",
        containers: [
          "#ppms_cm_consent_popup",
          "#ppms_cm_popup_overlay",
          ".ppms-popup"
        ],
        accept: [
          "#ppms_cm_agree-to-all",
          "#ppms_cm_agree-btn",
          'button[id*="agree"]'
        ],
        reject: [
          "#ppms_cm_reject-btn",
          '[data-id="reject-all"]'
        ]
      },
      {
        name: "Cookie-Information",
        note: "Danish CMP using coi- prefix; used by DSV, ECCO, Vestas, Maersk",
        containers: [
          "#coiOverlay",
          "#coiConsentBanner",
          ".coi-consent-banner",
          "#coiConsentBannerCategoriesWrapper",
          '[id^="coiConsentBanner"]',
          '[class*="coi-consent-banner"]',
          '[id^="coi-consent"]'
        ],
        accept: [
          "#coiConsentBannerBtnAcceptAll",
          ".coi-banner__accept",
          'button[data-action="accept"]',
          '[class*="coi-banner__accept"]',
          'button[id*="AcceptAll"]',
          ".coi-consent-banner__accept-all"
        ],
        reject: [
          "#coiConsentBannerBtnReject",
          ".coi-banner__decline",
          ".coi-banner__decline-all",
          'button[data-action="reject"]',
          '[class*="coi-banner__decline"]',
          ".coi-consent-banner__reject",
          ".coi-consent-banner__decline-all"
        ]
      },
      {
        name: "Amazon-SP-CC",
        note: "Amazon native cookie consent; covers IMDB, Prime Video, Audible",
        containers: [
          "#sp-cc",
          'div[data-cel-widget="sp-cc"]',
          ".sp-cc",
          "#privacy-consent-banner",
          ".a-section.a-spacing-base.a-text-center.sp-cc",
          "#consent-page",
          ".imdb-consent-banner",
          '[class*="consent-bump"]',
          "#a-popover-sp-cc",
          'form[action*="consent"]'
        ],
        accept: [
          "#sp-cc-accept",
          'input[name="accept"]',
          'button[data-action="sp-cc-accept"]',
          '[data-cel-widget="sp-cc-accept"]',
          '[data-a-target="accept-button"]',
          '.a-button-input[name="accept"]',
          '[data-testid="accept-button"]',
          'button[data-testid*="accept"]',
          'span.a-button-inner input[name="accept"]',
          '.celwidget input[type="submit"][name="accept"]',
          'input[data-action-type="ACCEPT_ALL"]'
        ],
        reject: [
          "#sp-cc-rejectall-link",
          "#sp-cc-rejectall",
          'a[data-action="sp-cc-rejectall"]',
          '[data-cel-widget="sp-cc-rejectall-link"]',
          '[data-a-target="reject-button"]',
          "#sp-cc-reject",
          '[data-testid="reject-button"]',
          'button[data-testid*="reject"]',
          'a[href*="sp-cc-rejectall"]',
          'input[data-action-type="REJECT_ALL"]'
        ]
      },
      {
        name: "Amazon-Privacy-Alert",
        note: 'Amazon "Your Privacy Choices" link banner on amazon.com front page',
        containers: [
          ".privacy-consent-modal",
          '.a-popover[id*="privacy"]',
          "#a-popover-sp-cc"
        ],
        accept: [
          'button.a-button-primary[name*="accept"]',
          "#privacy-accept-button"
        ],
        reject: [
          'button[name*="reject"]',
          "#privacy-reject-button"
        ]
      },
      {
        name: "Twitch-Consent",
        note: "Twitch (Amazon subsidiary) cookie consent",
        containers: [
          'div[data-a-target="consent-banner"]',
          ".consent-banner"
        ],
        accept: [
          'button[data-a-target="consent-banner-accept"]'
        ],
        reject: [
          'button[data-a-target="consent-banner-reject"]'
        ]
      },
      {
        name: "EU-Cookie-Consent-Kit",
        note: "EU DIGIT Cookie Consent Kit \u2014 mandated across all EU institutions",
        containers: [
          "#cookie-consent-banner",
          ".cck-container",
          ".cck-block",
          "#eu-cookie-compliance-banner",
          ".eu-cookie-compliance-banner",
          "#cck-module",
          ".cck-module",
          ".epjs-cookie-banner",
          "#eurlex-cookie-consent",
          ".publications-eu-cookies",
          ".cookie-compliance-banner",
          "#cookie-compliance-banner"
        ],
        accept: [
          ".cck-button--accept",
          "#cck-btn--accept-all",
          ".eu-cookie-compliance-agree-button",
          "a.agree-button",
          "#cck-btn-accept",
          ".cck-btn--accept",
          ".epjs-cookie-btn-accept",
          ".agree-button.eu-cookie-compliance-agree-button",
          '[class*="cck-button"][class*="accept"]',
          '[data-cck-action="accept"]'
        ],
        reject: [
          ".cck-button--refuse",
          "#cck-btn--refuse-all",
          ".eu-cookie-compliance-reject-button",
          "a.eu-cookie-compliance-reject-button",
          "#cck-btn-refuse",
          ".cck-btn--refuse",
          ".epjs-cookie-btn-refuse",
          '[data-cck-action="refuse"]',
          '[data-cck-action="reject"]'
        ],
        manage: [
          ".cck-button--preferences",
          "#cck-btn--preferences",
          ".eu-cookie-compliance-more-button",
          '[data-cck-action="preferences"]'
        ],
        postClick: 700
      },
      {
        name: "EuroParl-Cookie",
        note: "europarl.europa.eu \u2014 own Drupal theme with epjs- prefix",
        containers: [
          ".epjs-cookie-consent",
          "#epjs-cookie-module"
        ],
        accept: [
          ".epjs-cookie-btn--accept",
          'button[id*="epjs-accept"]'
        ],
        reject: [
          ".epjs-cookie-btn--refuse",
          'button[id*="epjs-refuse"]'
        ]
      },
      {
        name: "etracker-Consent",
        note: "Used by many German federal sites (bund.de, bmj.de, destatis.de)",
        containers: [
          "#et-consent-banner",
          ".et-consent-banner",
          ".et-cookie-manager",
          "#etConsent",
          '[id^="etracker-"]',
          '[class^="etracker-"]'
        ],
        accept: [
          "#et-consent-accept-all",
          ".et-consent-accept-all",
          ".et-consent-btn--accept",
          'button[data-consent-action="acceptAll"]',
          '[id*="etracker"][id*="accept"]'
        ],
        reject: [
          "#et-consent-decline-all",
          ".et-consent-decline-all",
          ".et-consent-btn--decline",
          'button[data-consent-action="declineAll"]',
          'button[data-consent-action="acceptRequired"]'
        ]
      },
      {
        name: "Bundesregierung-Cookie",
        note: "bundesregierung.de \u2014 custom TYPO3 cookie notice",
        containers: [
          ".cookie-note",
          ".js-cookie-note",
          "#cookie-note",
          ".breg-cookie-banner",
          '[class*="cookieBanner"]',
          '[id*="cookieBanner"]'
        ],
        accept: [
          ".cookie-note__button--accept",
          ".js-cookie-note-accept",
          '[data-action="cookie-accept-all"]',
          'button[class*="cookie"][class*="accept"]'
        ],
        reject: [
          ".cookie-note__button--reject",
          ".js-cookie-note-reject",
          '[data-action="cookie-reject"]',
          'button[class*="cookie"][class*="reject"]'
        ]
      },
      {
        name: "Bundestag-Cookie",
        note: "bundestag.de specific cookie consent",
        containers: [
          "#cookieConsent",
          ".cookieconsent-banner",
          "#bt-cookie-consent"
        ],
        accept: [
          ".cookieconsent-accept-all",
          "#bt-cookie-accept-all"
        ],
        reject: [
          ".cookieconsent-reject",
          "#bt-cookie-reject"
        ]
      },
      {
        name: "ARD-ZDF-Public-Broadcasting",
        note: "German public broadcasters (ard.de, zdf.de, mdr, ndr, wdr, hr)",
        containers: [
          ".consent-banner",
          "#consent-banner",
          ".ard-cookie-modal",
          ".szm-cookie-banner",
          ".zdf-cookie-consent",
          "#cookieConsent",
          ".zdf__cookie-consent",
          ".cookieBanner",
          "#cookieBanner",
          '[class*="szm-"][class*="consent"]',
          '[id*="szm"][id*="consent"]'
        ],
        accept: [
          ".consent-button--accept",
          ".ard-cookie-modal__btn--accept",
          'button[data-consent="accept-all"]',
          ".zdf-cookie-consent__btn--accept",
          ".c-button--accept",
          'button[id*="accept"][id*="cookie"]',
          ".cookieBanner__accept"
        ],
        reject: [
          ".consent-button--reject",
          ".ard-cookie-modal__btn--reject",
          'button[data-consent="reject-all"]',
          ".zdf-cookie-consent__btn--reject",
          ".cookieBanner__reject",
          'button[id*="reject"][id*="cookie"]',
          'button[data-consent="accept-essential"]',
          ".consent-button--essential"
        ]
      },
      {
        name: "Commanders-Act-TrustCommander",
        note: "Used by La Poste, SNCF, and many French sites; popin_tc_ prefix",
        containers: [
          "#popin_tc_privacy",
          "#popin_tc_privacy_container",
          ".tc-privacy-wrapper",
          ".popin-tc-privacy-container",
          '[id^="popin_tc_privacy"]'
        ],
        accept: [
          "#popin_tc_privacy_button_2",
          ".tc-submit-privacy",
          ".tc-privacy-btn--accept-all",
          'button[id*="popin_tc_privacy_button_2"]',
          '[class*="tc-privacy"][class*="accept"]'
        ],
        reject: [
          "#popin_tc_privacy_button_3",
          ".tc-refuse-all",
          ".tc-privacy-btn--refuse-all",
          'button[id*="popin_tc_privacy_button_3"]',
          '[class*="tc-privacy"][class*="refuse"]',
          '[class*="tc-privacy"][class*="reject"]'
        ]
      },
      {
        name: "Sourcepoint",
        note: "Often inside an iframe; used by many media publishers",
        containers: [
          '[id^="sp_message_container"]',
          "#sp-cc",
          'div[id^="sp_"]'
        ],
        shadowHost: '[id^="sp_message_container"]',
        scanIframe: true,
        accept: [
          '[title="Accept All"]',
          '[title="Alle akzeptieren"]',
          '[title="Tout accepter"]',
          '[title="Accetta tutto"]',
          ".sp_choice_type_11",
          'button[class*="accept"]',
          '[data-choice-id="11"]',
          'button[title*="Accept"]',
          'button[title*="akzeptieren"]',
          'button[aria-label*="Accept"]'
        ],
        reject: [
          '[title="Reject All"]',
          '[title="Alle ablehnen"]',
          '[title="Tout refuser"]',
          '[title="Rifiuta tutto"]',
          ".sp_choice_type_13",
          '[data-choice-id="13"]',
          'button[class*="reject"]',
          'button[title*="Reject"]',
          'button[title*="ablehnen"]',
          'button[aria-label*="Reject"]'
        ],
        manage: [
          '[title="Manage Preferences"]',
          '[title="Einstellungen"]',
          ".sp_choice_type_12"
        ],
        postClick: 1e3
      },
      {
        name: "HubSpot",
        note: "HubSpot integrated cookie notification bar",
        containers: [
          "#hs-eu-cookie-confirmation",
          "#hs-banner-parent"
        ],
        accept: [
          "#hs-eu-confirmation-button",
          'a[id*="hs-eu-confirmation"]'
        ],
        reject: [
          "#hs-eu-decline-button",
          'a[id*="hs-eu-decline"]'
        ]
      },
      {
        name: "CookieConsent-OrestBida",
        note: "cookie-consent v3 by Orest Bida (open source, very common)",
        containers: [
          "#cc-main",
          ".cc--anim",
          ".cc-window"
        ],
        accept: [
          "#c-p-bn",
          "#c-all-bn",
          '.c-bn[data-cc="accept-all"]',
          'button[data-cc="accept-all"]'
        ],
        reject: [
          "#c-rall-bn",
          '.c-bn[data-cc="accept-necessary"]',
          'button[data-cc="accept-necessary"]'
        ],
        manage: [
          "#c-settings-bn",
          'button[data-cc="show-preferencesModal"]'
        ],
        postClick: 600
      },
      {
        name: "Klaro",
        note: "Open-source Klaro CMP",
        containers: [
          ".klaro",
          "#klaro"
        ],
        accept: [
          ".cm-btn.cm-btn-success-var",
          ".cm-btn.cm-btn-success"
        ],
        reject: [
          ".cm-btn.cn-decline",
          '[data-type="decline"]'
        ]
      },
      {
        name: "WP-GDPR-Cookie-Notice",
        note: "WordPress Cookie Notice plugin (van Ons)",
        containers: [
          "#cookie-notice-wrapper",
          ".cn-wrapper"
        ],
        accept: [
          "#cn-notice-accept",
          ".cn-notice-btn-ok"
        ],
        reject: [
          "#cn-notice-decline"
        ]
      },
      {
        name: "CookieHub",
        note: "CookieHub SaaS CMP",
        containers: [
          ".ch2-container",
          "#ch2-dialog",
          ".ch2"
        ],
        accept: [
          ".ch2-btn.ch2-btn--accept",
          'button[data-ch2-action="accept-all"]'
        ],
        reject: [
          ".ch2-btn.ch2-btn--reject",
          'button[data-ch2-action="reject-all"]'
        ]
      },
      {
        name: "Metomic",
        note: "Metomic consent manager (popular in SaaS/startup space)",
        containers: [
          ".metomic-ConsentWall",
          '[id^="metomic-"]'
        ],
        accept: [
          ".metomic-ConsentWall-primaryButton",
          'button[data-id="allowAll"]'
        ],
        reject: [
          ".metomic-ConsentWall-secondaryButton",
          'button[data-id="denyAll"]'
        ]
      },
      {
        name: "Admiral-VRM",
        note: "Admiral VRM consent manager",
        containers: [
          "#adm-consent-overlay",
          ".adm-consent-manager"
        ],
        accept: [
          ".adm-accept-all"
        ],
        reject: [
          ".adm-deny-all"
        ]
      },
      {
        name: "GOVUK-Cookie-Banner",
        note: "GOV.UK Design System cookie banner (custom, used across UK gov sites)",
        containers: [
          ".govuk-cookie-banner",
          "#global-cookie-message",
          '[data-module="cookie-banner"]',
          ".gem-c-cookie-banner",
          "#cookie-banner"
        ],
        accept: [
          'button[data-accept-cookies="true"]',
          'button[data-module="cookie-banner-accept"]',
          ".js-cookie-banner-accept",
          ".gem-c-cookie-banner__accept-button",
          'button[value="accept"]'
        ],
        reject: [
          'button[data-reject-cookies="true"]',
          'button[data-module="cookie-banner-reject"]',
          ".js-cookie-banner-reject",
          ".gem-c-cookie-banner__reject-button",
          'button[value="reject"]'
        ]
      },
      {
        name: "Danske-Bank",
        note: "danskebank.com custom cookie banner with category checkboxes",
        containers: [
          '[class*="cookie-modal"]',
          '[class*="cookieModal"]',
          '[class*="cookie-banner"][class*="modal"]',
          '[class*="consent-modal"]',
          '[aria-describedby*="cookie" i][role="dialog"]',
          '[aria-labelledby*="cookie" i][role="dialog"]',
          "dialog[open]"
        ],
        accept: [
          ".button-accept",
          'button[class*="button-accept"]',
          'button[class*="buttonAccept"]'
        ],
        reject: [
          ".button-necessary",
          ".button-decline",
          ".button-required",
          'button[class*="button-necessary"]',
          'button[class*="button-decline"]',
          'button[class*="button-required"]',
          'button[class*="buttonNecessary"]',
          'button[class*="buttonDecline"]',
          'button[class*="buttonRequired"]'
        ]
      },
      {
        name: "Cassie",
        note: "Cassie CMP by Syrenis \u2014 uses cassie_ prefixed IDs. Initial banner has Reject/Accept/Manage buttons.",
        containers: [
          '[id^="cassie_nb"]',
          '[id*="cassie"][id*="container"]',
          '[class*="cassie-cookie"]',
          '[class*="cassie_cookie"]'
        ],
        accept: [
          '[id*="cassie"][id*="accept"]',
          'button[id*="cassie_nb_accept"]',
          'button[id*="cassie_accept_pre_preferences"]'
        ],
        reject: [
          '[id*="cassie"][id*="reject"]',
          'button[id*="cassie_nb_reject"]',
          'button[id*="cassie_reject_pre_preferences"]',
          'button[id*="cassie_reject_all"]'
        ],
        manage: [
          '[id*="cassie"][id*="preferences"]',
          'button[id*="cassie_nb_preferences"]'
        ],
        postClick: 800,
        manageFinalize: [
          'button[id*="cassie_save"]',
          'button[id*="cassie_reject_all"]',
          'button[id*="cassie_confirm"]'
        ]
      },
      {
        name: "OneTrust-Loreal",
        note: "L'Or\xE9al group sites (Maybelline, Garnier etc.) use OneTrust with custom layout",
        containers: [
          "#ot-sdk-btn-floating",
          ".ot-sdk-container",
          '[class*="onetrust"]',
          "#onetrust-banner-sdk"
        ],
        accept: [
          "#onetrust-accept-btn-handler",
          ".onetrust-accept-btn-handler",
          'button[id*="accept"][class*="onetrust"]'
        ],
        reject: [
          "#onetrust-reject-all-handler",
          ".ot-pc-refuse-all-handler",
          'button[id*="reject"][class*="onetrust"]'
        ]
      }
    ]
  };

  // content/src/cmp-dictionary.js
  function validateProfile(profile) {
    if (!profile || typeof profile !== "object") return false;
    if (!profile.name || typeof profile.name !== "string") return false;
    if (!Array.isArray(profile.containers) || profile.containers.length === 0) return false;
    if (!Array.isArray(profile.accept) || profile.accept.length === 0) return false;
    if (!Array.isArray(profile.reject) || profile.reject.length === 0) return false;
    if (profile.manage != null && !Array.isArray(profile.manage)) return false;
    if (profile.manageFinalize != null && !Array.isArray(profile.manageFinalize)) return false;
    if (profile.detect != null && !Array.isArray(profile.detect)) return false;
    if (profile.shadowHost != null && typeof profile.shadowHost !== "string") return false;
    if (profile.postClick != null && typeof profile.postClick !== "number") return false;
    if (profile.scanIframe != null && typeof profile.scanIframe !== "boolean") return false;
    return true;
  }
  var CMP_DICTIONARY = cmp_profiles_default.profiles;
  for (const profile of CMP_DICTIONARY) {
    if (!validateProfile(profile)) {
      console.error("[CookieGuardian] Invalid CMP profile:", profile && profile.name);
    }
  }

  // content/src/state.js
  var import_hostname = __toESM(require_hostname());
  var S = {
    settings: {
      preference: "moderate",
      enabled: true,
      showNotifications: true,
      debugMode: false,
      firstVisitConfirm: false
    },
    handled: false,
    pollingTimer: null,
    retryCount: 0,
    debounceTimer: null,
    hostHints: {},
    hostHintsLoaded: false,
    hostHintFastPathTried: false,
    moderateRejectPassCount: 0,
    moderateRejectUntilTs: 0,
    moderateFallingBack: false,
    lastGenericScanTs: 0,
    detectionInFlight: false,
    pendingPass: false,
    generation: 0,
    _domainApprovalPromise: null,
    /** True while the first-visit countdown toast is mounted (popup status). */
    firstVisitToastVisible: false,
    pageWhitelisted: false,
    activeWlKey: "cg_whitelisted_domains"
  };
  var HOST_HINTS_KEY = "cg_host_dismissal_hints";
  var TRUSTED_DOMAINS_KEY = "cg_trusted_domains";
  var HINT_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
  var HINT_MAX_ENTRIES = 500;
  var TRUSTED_MAX_ENTRIES = 200;
  var REPORT_MAX_ENTRIES = 100;
  var REPORT_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
  var REPORTS_STORAGE_KEY = "reports";
  var MAX_RETRY = 80;
  var DEBOUNCE_MS = 200;
  var GENERIC_SCAN_INTERVAL_MS = 500;
  var observerMap = /* @__PURE__ */ new Map();
  var SESSION_GUARD_KEY = "__cookieGuardian_guard__";
  var MAX_SESSION_CLICKS = 2;
  var GUARD_WINDOW_MS = 3e4;
  var WL_KEY_NORMAL = "cg_whitelisted_domains";
  var WL_KEY_PRIVATE = "cg_whitelisted_domains_private";
  var SETTINGS_SYNC_KEYS = ["preference", "enabled", "showNotifications", "debugMode", "firstVisitConfirm"];
  function hintEntryTs(value) {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (value && typeof value.ts === "number") return value.ts;
    return 0;
  }
  function pruneStorageMap(map, maxEntries, ttlMs) {
    if (!map || typeof map !== "object" || Array.isArray(map)) return map;
    const now = Date.now();
    for (const [key, value] of Object.entries(map)) {
      const ts = hintEntryTs(value);
      if (ttlMs !== Infinity && ts > 0 && now - ts > ttlMs) {
        delete map[key];
      }
    }
    const entries = Object.entries(map);
    if (entries.length > maxEntries) {
      entries.sort((a, b) => hintEntryTs(a[1]) - hintEntryTs(b[1]));
      const toRemove = entries.length - maxEntries;
      for (let i = 0; i < toRemove; i++) {
        delete map[entries[i][0]];
      }
    }
    return map;
  }
  function trustedDomainsToMap(raw) {
    if (!raw) return {};
    if (Array.isArray(raw)) {
      const now = Date.now();
      const o = {};
      for (const h of raw) {
        const n = (0, import_hostname.normalizeHostname)(String(h));
        if (n) o[n] = { ts: now };
      }
      return o;
    }
    if (typeof raw === "object") return { ...raw };
    return {};
  }
  async function migrateWhitelistHostnameArray(storageKey) {
    const data = await chrome.storage.local.get({ [storageKey]: [] });
    const raw = data[storageKey];
    if (!Array.isArray(raw)) return;
    const migrated = [...new Set(raw.map((d) => (0, import_hostname.normalizeHostname)(String(d))).filter(Boolean))].sort();
    let dirty = false;
    const seen = /* @__PURE__ */ new Set();
    for (const d of raw) {
      const n = (0, import_hostname.normalizeHostname)(String(d));
      if (!n) {
        dirty = true;
        continue;
      }
      if (String(d) !== n) dirty = true;
      seen.add(n);
    }
    if (seen.size !== migrated.length) dirty = true;
    if (migrated.length !== raw.length) dirty = true;
    if (dirty) {
      await chrome.storage.local.set({ [storageKey]: migrated });
    }
  }
  async function migrateObjectStorageHostnameKeys(storageKey) {
    const data = await chrome.storage.local.get(storageKey);
    const map = data[storageKey];
    if (!map || typeof map !== "object" || Array.isArray(map)) return;
    const migrated = {};
    let dirty = false;
    for (const [key, value] of Object.entries(map)) {
      const normalized = (0, import_hostname.normalizeHostname)(key);
      if (!normalized) {
        dirty = true;
        continue;
      }
      if (normalized !== key) dirty = true;
      const existing = migrated[normalized];
      if (existing === void 0) {
        migrated[normalized] = value;
      } else {
        const tNew = hintEntryTs(value);
        const tOld = hintEntryTs(existing);
        if (tNew >= tOld) migrated[normalized] = value;
        dirty = true;
      }
    }
    if (dirty || Object.keys(migrated).length !== Object.keys(map).length) {
      await chrome.storage.local.set({ [storageKey]: migrated });
    }
  }
  async function migrateTrustedDomainsStorage() {
    const data = await chrome.storage.local.get({ [TRUSTED_DOMAINS_KEY]: null });
    const raw = data[TRUSTED_DOMAINS_KEY];
    if (raw == null) return;
    if (Array.isArray(raw)) {
      const map = trustedDomainsToMap(raw);
      await chrome.storage.local.set({ [TRUSTED_DOMAINS_KEY]: map });
      return;
    }
    await migrateObjectStorageHostnameKeys(TRUSTED_DOMAINS_KEY);
  }
  async function migrateStoredHostnames() {
    await migrateWhitelistHostnameArray("cg_whitelisted_domains");
    await migrateWhitelistHostnameArray("cg_whitelisted_domains_private");
    await migrateTrustedDomainsStorage();
    await migrateObjectStorageHostnameKeys(HOST_HINTS_KEY);
    await migrateObjectStorageHostnameKeys(REPORTS_STORAGE_KEY);
  }
  async function pruneAllStorageOnStartup() {
    const data = await chrome.storage.local.get([
      HOST_HINTS_KEY,
      TRUSTED_DOMAINS_KEY,
      REPORTS_STORAGE_KEY
    ]);
    const patch = {};
    let dirty = false;
    if (data[HOST_HINTS_KEY] != null && typeof data[HOST_HINTS_KEY] === "object" && !Array.isArray(data[HOST_HINTS_KEY])) {
      const hints = { ...data[HOST_HINTS_KEY] };
      pruneStorageMap(hints, HINT_MAX_ENTRIES, HINT_TTL_MS);
      if (JSON.stringify(hints) !== JSON.stringify(data[HOST_HINTS_KEY])) {
        patch[HOST_HINTS_KEY] = hints;
        dirty = true;
      }
    }
    if (data[TRUSTED_DOMAINS_KEY] != null) {
      const map = trustedDomainsToMap(data[TRUSTED_DOMAINS_KEY]);
      const before = JSON.stringify(map);
      pruneStorageMap(map, TRUSTED_MAX_ENTRIES, Infinity);
      if (JSON.stringify(map) !== before || Array.isArray(data[TRUSTED_DOMAINS_KEY])) {
        patch[TRUSTED_DOMAINS_KEY] = map;
        dirty = true;
      }
    }
    if (data[REPORTS_STORAGE_KEY] != null && typeof data[REPORTS_STORAGE_KEY] === "object" && !Array.isArray(data[REPORTS_STORAGE_KEY])) {
      const reports = { ...data[REPORTS_STORAGE_KEY] };
      pruneStorageMap(reports, REPORT_MAX_ENTRIES, REPORT_TTL_MS);
      if (JSON.stringify(reports) !== JSON.stringify(data[REPORTS_STORAGE_KEY])) {
        patch[REPORTS_STORAGE_KEY] = reports;
        dirty = true;
      }
    }
    if (dirty) {
      await chrome.storage.local.set(patch);
    }
  }
  function shouldRunGenericScan(forceOnConsentContainer = false) {
    if (forceOnConsentContainer) return true;
    const now = Date.now();
    if (now - S.lastGenericScanTs < GENERIC_SCAN_INTERVAL_MS) return false;
    S.lastGenericScanTs = now;
    return true;
  }
  function pageCanonicalHost() {
    return (0, import_hostname.normalizeHostname)(location.hostname);
  }
  function getSessionClicks() {
    try {
      const raw = sessionStorage.getItem(SESSION_GUARD_KEY);
      if (!raw) return 0;
      const data = JSON.parse(raw);
      const canon = pageCanonicalHost();
      if (canon && data.host === canon && Date.now() - data.ts < GUARD_WINDOW_MS) {
        return data.clicks;
      }
      return 0;
    } catch (_) {
      return 0;
    }
  }
  function recordSessionClick() {
    try {
      const prev = getSessionClicks();
      const canon = pageCanonicalHost() || location.hostname;
      sessionStorage.setItem(SESSION_GUARD_KEY, JSON.stringify({
        host: canon,
        clicks: prev + 1,
        ts: Date.now()
      }));
      return prev + 1;
    } catch (_) {
      return 0;
    }
  }
  function clearSessionGuard() {
    try {
      sessionStorage.removeItem(SESSION_GUARD_KEY);
    } catch (_) {
    }
  }
  function log(...a) {
    if (S.settings.debugMode) console.log("[CookieGuardian]", ...a);
  }
  function warn(...a) {
    console.warn("[CookieGuardian]", ...a);
  }
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // content/src/dom-utils.js
  function collectShadowRoots(root = document) {
    const result = [];
    const queue = [root];
    let i = 0;
    while (i < queue.length) {
      const node = queue[i++];
      let elems;
      try {
        const ctx = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node : node;
        elems = ctx.querySelectorAll ? ctx.querySelectorAll("*") : [];
      } catch (_) {
        continue;
      }
      for (const el of elems) {
        if (el.shadowRoot) {
          result.push(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
      }
    }
    return result;
  }
  function createShadowRootCache() {
    const cache = /* @__PURE__ */ new WeakMap();
    return function getShadowRoots(r) {
      if (!r) return [];
      if (cache.has(r)) return cache.get(r);
      const list = collectShadowRoots(r);
      cache.set(r, list);
      return list;
    };
  }
  function deepQuery(selector, root = document, getShadowRoots = null) {
    try {
      const d = root.querySelector(selector);
      if (d) return d;
    } catch (_) {
    }
    const roots = getShadowRoots ? getShadowRoots(root) : collectShadowRoots(root);
    for (const sr of roots) {
      try {
        const f = sr.querySelector(selector);
        if (f) return f;
      } catch (_) {
      }
    }
    return null;
  }
  function deepQueryAll(selector, root = document, getShadowRoots = null) {
    const out = [];
    try {
      out.push(...root.querySelectorAll(selector));
    } catch (_) {
    }
    const roots = getShadowRoots ? getShadowRoots(root) : collectShadowRoots(root);
    for (const sr of roots) {
      try {
        out.push(...sr.querySelectorAll(selector));
      } catch (_) {
      }
    }
    return out;
  }
  function getProfileShadowRoot(profile) {
    if (!profile.shadowHost) return null;
    try {
      const host = document.querySelector(profile.shadowHost);
      return host?.shadowRoot ?? null;
    } catch (_) {
      return null;
    }
  }
  function queryFirst(selectors, root = document, shadowRoot = null, getShadowRoots = null) {
    for (const sel of selectors) {
      try {
        if (shadowRoot) {
          const e = shadowRoot.querySelector(sel);
          if (e) return e;
        }
        const light = root.querySelector(sel);
        if (light) return light;
        const deep = deepQuery(sel, root, getShadowRoots);
        if (deep) return deep;
      } catch (_) {
      }
    }
    return null;
  }
  function xpathText(text, ctx = document.body) {
    if (!ctx) return null;
    const lo = text.toLowerCase().replace(/'/g, "\\'");
    const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LO = "abcdefghijklmnopqrstuvwxyz";
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
    } catch (_) {
      return null;
    }
  }
  function isVisible(el) {
    if (!el) return false;
    try {
      if (el.offsetParent !== null) return true;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return true;
      const win = el.ownerDocument?.defaultView || window;
      const cs = win.getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
    } catch (_) {
      return true;
    }
  }
  function getLabel(el) {
    return (el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("value") || el.getAttribute("data-label") || "").replace(/\s+/g, " ").trim();
  }
  function isUnsafeHeuristicAnchor(el) {
    if (!el || el.tagName !== "A") return false;
    const href = el.getAttribute("href") || "";
    return !!href && !href.startsWith("#") && !href.startsWith("javascript:");
  }
  function xpathTextFirstSafe(text, ctx = document.body) {
    if (!ctx) return null;
    const lo = text.toLowerCase().replace(/'/g, "\\'");
    const UP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const LO = "abcdefghijklmnopqrstuvwxyz";
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
    } catch (_) {
    }
    return null;
  }
  async function safeClick(el) {
    if (!el) return false;
    const ownerWin = el.ownerDocument?.defaultView || window;
    if (S.settings.debugMode) {
      console.log("[CG] safeClick: target in", el.ownerDocument?.URL || "unknown");
    }
    if (!isVisible(el)) {
      log("Not visible \u2014 skip:", el.tagName, el.id || getLabel(el).slice(0, 40));
      return false;
    }
    try {
      const isAnchor = el.tagName === "A";
      const href = isAnchor ? el.getAttribute("href") || "" : "";
      const wouldNavigate = isAnchor && href && !href.startsWith("#") && !href.startsWith("javascript:");
      const opts = { bubbles: true, cancelable: true, view: ownerWin };
      let usedDispatchFallback = false;
      try {
        for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
          el.dispatchEvent(new ownerWin.MouseEvent(type, opts));
        }
      } catch (e) {
        usedDispatchFallback = true;
        try {
          el.click();
        } catch (_) {
        }
      }
      if (wouldNavigate) {
        log("\u26A0 Anchor with navigating href \u2014 skipped .click() to prevent navigation");
      } else if (!usedDispatchFallback) {
        el.click?.();
      }
      const totalClicks = recordSessionClick();
      log(
        "\u2713 Clicked:",
        el.tagName,
        el.id || el.className?.toString().slice(0, 50) || getLabel(el).slice(0, 40),
        `(session click #${totalClicks} on ${location.hostname})`
      );
      return true;
    } catch (err) {
      warn("Click failed:", err);
      return false;
    }
  }
  function isSearchEngineResultsPage() {
    const host = pageCanonicalHost();
    if (!host) return false;
    const path = location.pathname;
    const q = location.search;
    if (/(^|\.)google\./i.test(host) && path.startsWith("/search")) return true;
    if (host === "bing.com" && path.startsWith("/search")) return true;
    if (host === "duckduckgo.com" && (path === "/" || path === "") && /[?&]q=/.test(q)) return true;
    if (host === "search.yahoo.com") return true;
    if (host === "yahoo.com" && path.startsWith("/search")) return true;
    if (host === "ecosia.org" && path.startsWith("/search")) return true;
    if (host === "startpage.com" && path.startsWith("/sp/search")) return true;
    if (host === "search.brave.com" && path.startsWith("/search")) return true;
    return false;
  }
  function intersectsLowerViewport(el, fraction) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const line = vh * fraction;
    return r.bottom > line && r.top < vh - 8;
  }
  function dedupeOverlayAncestors(nodes) {
    const arr = [...nodes];
    return arr.filter((el) => !arr.some((other) => other !== el && el.contains(other)));
  }
  function hasConsentKeywords(text) {
    const lower = String(text || "").toLowerCase();
    return /cookie|consent|gdpr|privacy|data protection|çerez|datenschutz|cookies?/i.test(lower);
  }
  function getScopedConsentText(candidateRoots) {
    for (const root of candidateRoots) {
      const text = root.textContent || "";
      if (hasConsentKeywords(text)) return text;
    }
    if (candidateRoots.length) {
      let acc = "";
      for (const root of candidateRoots) {
        acc += (root.textContent || "") + "\n";
        if (acc.length > 12e3) break;
      }
      if (acc.trim()) return acc;
    }
    try {
      const fixed = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
      for (const el of fixed) {
        const text = el.textContent || "";
        if (hasConsentKeywords(text)) return text;
      }
    } catch (_) {
    }
    try {
      if (!document.body) return "";
      const all = document.body.getElementsByTagName("*");
      const limit = Math.min(all.length, 500);
      for (let j = 0; j < limit; j++) {
        const el = all[j];
        let pos;
        try {
          pos = window.getComputedStyle(el).position;
        } catch (_) {
          continue;
        }
        if (pos !== "fixed" && pos !== "sticky") continue;
        const text = el.textContent || "";
        if (text.length < 10 || text.length > 8e3) continue;
        if (hasConsentKeywords(text)) return text;
      }
    } catch (_) {
    }
    return "";
  }
  function gatherLikelyCookieOverlays() {
    const roots = /* @__PURE__ */ new Set();
    try {
      const dialogs = document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]');
      for (const d of dialogs) {
        if (isVisible(d)) roots.add(d);
      }
      const vh = window.innerHeight;
      const all = document.body ? document.body.getElementsByTagName("*") : [];
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        let style;
        try {
          style = window.getComputedStyle(el);
        } catch (_) {
          continue;
        }
        const pos = style.position;
        if (pos !== "fixed" && pos !== "sticky") continue;
        if (!isVisible(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 64 || r.height < 20) continue;
        if (!intersectsLowerViewport(el, 0.45)) continue;
        const z = parseInt(style.zIndex, 10);
        if (pos === "fixed" && (r.bottom >= vh * 0.35 || !Number.isNaN(z) && z >= 50)) {
          roots.add(el);
        } else if (pos === "sticky") {
          roots.add(el);
        }
      }
    } catch (_) {
    }
    return dedupeOverlayAncestors(roots);
  }

  // content/src/heuristics.js
  var ACCEPT_PATTERNS = [
    // ── English ────────────────────────────────────────────────────────
    /^accept\s+all\b/i,
    /^allow\s+all\b/i,
    /^agree\s+to\s+all\b/i,
    /^consent\s+to\s+all\b/i,
    /^i\s+accept\b/i,
    /^yes[,!\s]+accept/i,
    /^got\s+it!?$/i,
    /^ok(ay)?[!.\s]*$/i,
    /^agree\b/i,
    // Standalone short-form patterns (from Cookie Consent Automator)
    /^accept$/i,
    /^allow$/i,
    /accept\s+cookies?\b/i,
    /^accept\s+.*cookies?\b/i,
    /^allow\s+.*cookies?\b/i,
    // ── Turkish ────────────────────────────────────────────────────────
    /^tümünü\s+kabul\s+et\b/i,
    /^kabul\s+et\b/i,
    /^hepsini\s+kabul\s+et\b/i,
    /^tümüne\s+izin\s+ver\b/i,
    /^tümünü\s+onayla\b/i,
    /^çerezleri\s+kabul\s+et\b/i,
    /^onaylıyorum\b/i,
    // ── German ─────────────────────────────────────────────────────────
    /^alle\s+akzeptieren\b/i,
    /^alles\s+akzeptieren\b/i,
    /^alle\s+zulassen\b/i,
    /^alle\s+cookies?\s+akzeptieren\b/i,
    /^zustimmen\b/i,
    /^ich\s+stimme\s+zu\b/i,
    /^akzeptieren\b/i,
    /^alle\s+auswählen\b/i,
    /^einverstanden\b/i,
    /^alle\s+annehmen\b/i,
    /^annehmen\b/i,
    // ── French ─────────────────────────────────────────────────────────
    /^tout\s+accepter\b/i,
    /^accepter\s+tout\b/i,
    /^j'accepte\b/i,
    /^accepter\b/i,
    /^je\s+suis\s+d'accord\b/i,
    // ── Spanish ────────────────────────────────────────────────────────
    /^aceptar\s+todo\b/i,
    /^aceptar\s+todas\b/i,
    /^acepto\s+todo\b/i,
    /^aceptar\b/i,
    // ── Italian ────────────────────────────────────────────────────────
    /^accetta\s+tutto\b/i,
    /^accetta\s+tutti\b/i,
    /^accetto\b/i,
    /^acconsento\b/i,
    // ── Dutch ──────────────────────────────────────────────────────────
    /^alles\s+accepteren\b/i,
    /^alle\s+cookies\s+accepteren\b/i,
    /^akkoord\b/i,
    /^accepteer\s+alles\b/i,
    // ── Portuguese ─────────────────────────────────────────────────────
    /^aceitar\s+tudo\b/i,
    /^aceito\s+tudo\b/i,
    /^aceitar\b/i,
    // ── Polish ─────────────────────────────────────────────────────────
    /^akceptuj\s+wszystko\b/i,
    /^zaakceptuj\s+wszystkie\b/i,
    /^akceptuję\b/i,
    // ── Swedish / Norwegian / Danish ───────────────────────────────────
    /^acceptera\s+alla\b/i,
    /^godkänn\s+alla\b/i,
    /^godkend\s+alle\b/i,
    /^godta\s+alle\b/i,
    /^tillad\s+alle\b/i,
    // ── Finnish ────────────────────────────────────────────────────────
    /^hyväksy\s+kaikki\b/i,
    /^hyväksyn\b/i,
    // ── Czech / Slovak ─────────────────────────────────────────────────
    /^přijmout\s+vše\b/i,
    /^prijať\s+všetko\b/i,
    // ── Greek ──────────────────────────────────────────────────────────
    /^αποδοχή\s+όλων\b/i,
    /^αποδέχομαι\s+όλα\b/i,
    // ── Romanian ───────────────────────────────────────────────────────
    /^acceptați?\s+toate\b/i,
    // ── Hungarian ──────────────────────────────────────────────────────
    /^elfogad\s+mindent\b/i,
    /^mindet\s+elfogadom\b/i,
    // ── CJK ────────────────────────────────────────────────────────────
    /全て(に)?同意/,
    /すべて(を)?受け入れる/,
    /모두\s*동의/,
    /全部接受/,
    /接受所有/
  ];
  var REJECT_PATTERNS = [
    // ── English ────────────────────────────────────────────────────────
    /^reject\s+all\b/i,
    /^decline\s+all\b/i,
    /^deny\s+all\b/i,
    /^refuse\s+all\b/i,
    /^no\s+thanks?\.?$/i,
    /^only\s+(strictly\s+)?(necessary|essential|required)\b/i,
    /^use\s+necessary\s+only\b/i,
    /strictly\s+necessary\s+only/i,
    /^do\s+not\s+(consent|accept)\b/i,
    /^save\s+my\s+preferences\b/i,
    /^continue\s+without\s+accepting\b/i,
    /^necessary\s+cookies\s+only\b/i,
    /^essential\s+only\b/i,
    // Standalone short-form patterns (from Cookie Consent Automator)
    /^reject$/i,
    /^decline$/i,
    /^refuse$/i,
    /necessary\s+only/i,
    /strictly\s+necessary/i,
    /reject\s+non[\s-]?essential/i,
    /^reject\s+.*cookies?\b/i,
    /^decline\s+.*cookies?\b/i,
    /^refuse\s+.*cookies?\b/i,
    // "OK to necessary" family (e.g. Danske Bank, similar secondary panels)
    /^ok\s+to\s+necessary\b/i,
    /^ok\s+to\s+(required|essential)\b/i,
    // ── Turkish ────────────────────────────────────────────────────────
    /^reddet\b/i,
    /^tümünü\s+reddet\b/i,
    /^hepsini\s+reddet\b/i,
    /^çerezleri\s+reddet\b/i,
    /^kabul\s+etmiyorum\b/i,
    /^sadece\s+gerekli\b/i,
    /^yalnızca\s+zorunlu\b/i,
    /^zorunlu\s+çerezler\b/i,
    // ── German ─────────────────────────────────────────────────────────
    /^alle\s+ablehnen\b/i,
    /^alles\s+ablehnen\b/i,
    /^ablehnen\b/i,
    /^nicht\s+akzeptieren\b/i,
    /^nur\s+(notwendige|essenzielle)\s+cookies?\b/i,
    /^ohne\s+einwilligung\s+fortfahren\b/i,
    /^weiter\s+ohne\s+einwilligung\b/i,
    /^nur\s+notwendige\b/i,
    /^notwendige\s+cookies?\s+akzeptieren\b/i,
    // "Auswahl bestätigen" = confirm selection (reject-equivalent when only necessary is checked)
    /^auswahl\s+bestätigen\b/i,
    /^auswahl\s+bestatigen\b/i,
    // ── French ─────────────────────────────────────────────────────────
    /^tout\s+refuser\b/i,
    /^refuser\s+tout\b/i,
    /\btout\s+refuser\b/i,
    /^je\s+refuse\b/i,
    /^continuer\s+sans\s+accepter\b/i,
    /^refuser\b/i,
    /^seulement\s+nécessaires\b/i,
    // ── Spanish ────────────────────────────────────────────────────────
    /^rechazar\s+todo\b/i,
    /^rechazar\s+todas\b/i,
    /^rechazar\b/i,
    /^no\s+acepto\b/i,
    /^solo\s+necesarias\b/i,
    // ── Italian ────────────────────────────────────────────────────────
    /^rifiuta\s+tutto\b/i,
    /^rifiuta\s+tutti\b/i,
    /^rifiuto\b/i,
    /^solo\s+necessari\b/i,
    // ── Dutch ──────────────────────────────────────────────────────────
    /^alles\s+weigeren\b/i,
    /^alles\s+afwijzen\b/i,
    /^weigeren\b/i,
    /^alleen\s+noodzakelijk\b/i,
    // ── Portuguese ─────────────────────────────────────────────────────
    /^rejeitar\s+tudo\b/i,
    /^recusar\s+tudo\b/i,
    /^rejeitar\b/i,
    // ── Polish ─────────────────────────────────────────────────────────
    /^odrzuć\s+wszystko\b/i,
    /^odmów\b/i,
    // ── Swedish / Norwegian / Danish ───────────────────────────────────
    /^avvisa\s+alla\b/i,
    /^avvis\s+alle\b/i,
    /^afvis\s+alle\b/i,
    /^neka\s+alla\b/i,
    /^afvis\b/i,
    // Danish: "kun nødvendige" = "only necessary"
    /^kun\s+nødvendige\b/i,
    /^kun\s+nødvendige\s+cookies?\b/i,
    // Swedish: "endast nödvändiga"
    /^endast\s+nödvändiga\b/i,
    /^acceptera\s+nödvändiga\b/i,
    // ── Finnish ────────────────────────────────────────────────────────
    /^hylkää\s+kaikki\b/i,
    // ── Czech / Slovak ─────────────────────────────────────────────────
    /^odmítnout\s+vše\b/i,
    /^odmietnuť\s+všetko\b/i,
    // ── Greek ──────────────────────────────────────────────────────────
    /^απόρριψη\s+όλων\b/i,
    // ── CJK ────────────────────────────────────────────────────────────
    /全て(を)?拒否/,
    /必要なもの(のみ)?を受け入れる/,
    /모두\s*거부/,
    /全部拒绝/,
    /拒绝所有/
  ];
  var REJECT_XPATH = [
    "reject all",
    "decline all",
    "only necessary",
    "t\xFCm\xFCn\xFC reddet",
    "reddet",
    "sadece gerekli",
    "alle ablehnen",
    "ablehnen",
    "nur notwendige",
    "tout refuser",
    "refuser",
    "continuer sans accepter",
    "rechazar todo",
    "rifiuta tutto",
    "alles weigeren",
    "rejeitar tudo",
    "odrzu\u0107 wszystko",
    "avvisa alla",
    "hylk\xE4\xE4 kaikki",
    "odm\xEDtnout v\u0161e",
    // Additional terms from Cookie Consent Automator
    "reject non-essential",
    "necessary only",
    // Secondary-panel / "OK to necessary" style buttons (e.g. Danske Bank)
    "ok to necessary",
    "ok to required",
    "ok to essential",
    // Danish / Norwegian / Swedish
    "kun n\xF8dvendige",
    "endast n\xF6dv\xE4ndiga",
    // German government / confirm-selection style (Bundesrat)
    "auswahl best\xE4tigen",
    "auswahl bestatigen"
  ];
  var ACCEPT_XPATH = [
    "accept all",
    "allow all",
    "t\xFCm\xFCn\xFC kabul",
    "kabul et",
    "alle akzeptieren",
    "akzeptieren",
    "zustimmen",
    "tout accepter",
    "accepter",
    "aceptar todo",
    "accetta tutto",
    "alles accepteren",
    "hyv\xE4ksy kaikki",
    // Additional terms from Cookie Consent Automator
    "accept cookies",
    "onayl\u0131yorum",
    // German
    "alle annehmen",
    "annehmen"
  ];
  function findEflButton(intent, getShadowRoots = null) {
    const hosts = deepQueryAll('efl-button, .efl-button, [is="efl-button"]', document, getShadowRoots);
    const patterns = intent === "reject" ? REJECT_PATTERNS : ACCEPT_PATTERNS;
    for (const host of hosts) {
      const label = getLabel(host);
      if (patterns.some((rx) => rx.test(label))) {
        log(`efl-button match: "${label}"`);
        return host;
      }
      if (host.shadowRoot) {
        const inner = host.shadowRoot.querySelector('button, [role="button"], span');
        if (inner && patterns.some((rx) => rx.test(getLabel(inner)))) {
          log(`efl-button shadow-inner match: "${getLabel(inner)}"`);
          return host;
        }
      }
    }
    return null;
  }
  function isConsentRelatedMarkup(el) {
    let cls = "";
    if (typeof el.className === "string") cls = el.className.toLowerCase();
    else if (el.className && typeof el.className.baseVal === "string") cls = el.className.baseVal.toLowerCase();
    const tag = el.tagName.toLowerCase();
    const id = (el.id || "").toLowerCase();
    const role = (el.getAttribute?.("role") || "").toLowerCase();
    const aria = (el.getAttribute?.("aria-label") || "").toLowerCase();
    let blob = `${tag} ${id} ${cls} ${role} ${aria}`;
    try {
      for (const name of el.getAttributeNames?.() || []) {
        const ln = name.toLowerCase();
        if (ln.startsWith("data-")) blob += ` ${ln} ${(el.getAttribute(name) || "").toLowerCase()}`;
      }
    } catch (_) {
    }
    return /consent|cookie|gdpr|privacy|cmp|banner|notice/i.test(blob);
  }
  function findCustomConsentElements(intent) {
    if (!document.body) return null;
    const patterns = intent === "reject" ? REJECT_PATTERNS : ACCEPT_PATTERNS;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(el2) {
          if (!el2.tagName.includes("-")) return NodeFilter.FILTER_SKIP;
          if (!isConsentRelatedMarkup(el2)) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let el;
    while (el = walker.nextNode()) {
      const clickables = el.querySelectorAll?.('button, a, [role="button"]') ?? [];
      for (const btn of clickables) {
        if (patterns.some((rx) => rx.test(getLabel(btn)))) {
          log(`Custom element match <${el.tagName.toLowerCase()}>: "${getLabel(btn)}"`);
          return btn;
        }
      }
      if (el.shadowRoot) {
        const shadowBtns = el.shadowRoot.querySelectorAll('button, a, [role="button"]');
        for (const btn of shadowBtns) {
          if (patterns.some((rx) => rx.test(getLabel(btn)))) {
            log(`Custom element shadow match: "${getLabel(btn)}"`);
            return btn;
          }
        }
      }
    }
    return null;
  }
  function isConsentContext(el) {
    const consentMarkers = [
      "cookie",
      "consent",
      "gdpr",
      "privacy",
      "ccpa",
      "cmp",
      "notice",
      "banner",
      "onetrust",
      "cookiebot",
      "termly",
      "quantcast",
      "didomi",
      "osano",
      "iubenda",
      "trustarc"
    ];
    let node = el;
    const maxDepth = 15;
    let depth = 0;
    while (node && node !== document.body && depth < maxDepth) {
      const id = (node.id || "").toLowerCase();
      const cls = node.className && typeof node.className === "string" ? node.className.toLowerCase() : "";
      const role = (node.getAttribute?.("role") || "").toLowerCase();
      const ariaLabel = (node.getAttribute?.("aria-label") || "").toLowerCase();
      const combined = `${id} ${cls} ${role} ${ariaLabel}`;
      if (consentMarkers.some((m) => combined.includes(m))) return true;
      if (role === "dialog" || role === "alertdialog") return true;
      node = node.parentElement;
      depth++;
    }
    const container = el.closest?.('[class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [role="dialog"]');
    if (container) return true;
    const lexRoot = el.closest(
      'section, article, main, aside, [role="dialog"], [role="alertdialog"], [aria-modal="true"], [class*="cookie"], [class*="consent"], [id*="cookie"], [id*="consent"], [class*="gdpr"], [id*="gdpr"], [class*="privacy"], [id*="privacy"]'
    );
    if (lexRoot) {
      const t = (lexRoot.textContent || "").toLowerCase();
      if (t.length && (/\b(cookies?|çerez|consent|gdpr|datenschutz|iubenda|onetrust|cookiebot)\b/i.test(t) || /privacy.{0,48}cookie|cookie.{0,48}priva|tracking.{0,24}cookie/i.test(t))) return true;
    }
    return false;
  }
  function didBannerDisappear(bannerEl, timeoutMs = 1e3) {
    return new Promise((resolve) => {
      const check = () => {
        if (!bannerEl.isConnected || !isVisible(bannerEl)) {
          resolve(true);
        } else {
          resolve(false);
        }
      };
      setTimeout(check, timeoutMs);
    });
  }
  var CLICKABLE_SEL = [
    "button",
    "a[href]",
    "a:not([href])",
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '[tabindex="0"]'
  ].join(",");
  function isUnsafeHeuristicAnchor2(el) {
    if (!el || el.tagName !== "A") return false;
    const href = el.getAttribute("href") || "";
    return !!href && !href.startsWith("#") && !href.startsWith("javascript:");
  }
  function collectClickables(root, opts = {}, getShadowRoots = null) {
    const rejectNav = opts.rejectNavAnchors === true;
    const commerceMarkers = ["cart", "checkout", "payment", "subscribe", "signup", "login", "register"];
    const els = deepQueryAll(CLICKABLE_SEL, root, getShadowRoots);
    return els.filter((el) => {
      if (el.tagName === "A" && el.hasAttribute("href")) return false;
      if (rejectNav && isUnsafeHeuristicAnchor2(el)) return false;
      if (el.closest("form") && !isConsentContext(el)) return false;
      const commerceShell = el.closest("section, article, main");
      if (commerceShell) {
        const id = (commerceShell.id || "").toLowerCase();
        const cls = commerceShell.className && typeof commerceShell.className === "string" ? commerceShell.className.toLowerCase() : "";
        const combined = `${id} ${cls}`;
        if (commerceMarkers.some((m) => combined.includes(m)) && !isConsentContext(el)) return false;
      }
      if (!isConsentContext(el)) return false;
      const l = getLabel(el);
      return l.length > 0 && l.length < 120;
    });
  }
  function scoreAgainst(label, patterns) {
    let score = 0;
    for (const rx of patterns) {
      if (rx.test(label)) score += rx.source.startsWith("^") ? 12 : 7;
    }
    return score;
  }
  function findByHeuristic(intent, root = document, opts = {}, getShadowRoots = null) {
    const rejectNav = opts.rejectNavAnchors === true;
    const skipGlobal = opts.skipEflCustom === true;
    const patterns = intent === "reject" ? REJECT_PATTERNS : ACCEPT_PATTERNS;
    const xpathTerms = intent === "reject" ? REJECT_XPATH : ACCEPT_XPATH;
    const THRESHOLD = 7;
    const candidates = collectClickables(root, { rejectNavAnchors: rejectNav }, getShadowRoots);
    log(`Heuristic: ${candidates.length} clickables, intent="${intent}"`);
    let best = null, bestScore = 0;
    for (const el of candidates) {
      if (!isConsentContext(el)) continue;
      const s = scoreAgainst(getLabel(el), patterns);
      if (s > bestScore) {
        bestScore = s;
        best = el;
      }
    }
    if (best && bestScore >= THRESHOLD) {
      log(`Score match (${bestScore}): "${getLabel(best)}"`);
      return best;
    }
    const xCtx = root === document ? document.body : root;
    for (const term of xpathTerms) {
      const el = rejectNav ? xpathTextFirstSafe(term, xCtx) : xpathText(term, xCtx);
      if (el && isVisible(el)) {
        if (!isConsentContext(el)) {
          log(`XPath: "${term}" \u2014 skip (not consent context)`);
          continue;
        }
        log(`XPath: "${term}" \u2192`, getLabel(el));
        return el;
      }
    }
    if (skipGlobal) return null;
    const efl = findEflButton(intent, getShadowRoots);
    if (efl) {
      if (!isConsentContext(efl)) log("efl-button \u2014 skip (not consent context)");
      else return efl;
    }
    const custom = findCustomConsentElements(intent);
    if (custom) {
      if (!isConsentContext(custom)) log("custom consent el \u2014 skip (not consent context)");
      else return custom;
    }
    return null;
  }

  // content/src/orchestrator.js
  var deepQuery2 = deepQuery;
  var queryFirst2 = queryFirst;
  var createShadowRootCache2 = createShadowRootCache;
  var collectShadowRoots2 = collectShadowRoots;
  var getProfileShadowRoot2 = getProfileShadowRoot;
  var isVisible2 = isVisible;
  var getLabel2 = getLabel;
  var safeClick2 = safeClick;
  var getScopedConsentText2 = getScopedConsentText;
  var gatherLikelyCookieOverlays2 = gatherLikelyCookieOverlays;
  var isSearchEngineResultsPage2 = isSearchEngineResultsPage;
  var findByHeuristic2 = findByHeuristic;
  var isConsentContext2 = isConsentContext;
  var didBannerDisappear2 = didBannerDisappear;
  function getTrustedDomains() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [TRUSTED_DOMAINS_KEY]: {} }, (result) => {
        const raw = result[TRUSTED_DOMAINS_KEY];
        if (Array.isArray(raw)) {
          resolve(new Set(raw));
        } else if (raw && typeof raw === "object") {
          resolve(new Set(Object.keys(raw)));
        } else {
          resolve(/* @__PURE__ */ new Set());
        }
      });
    });
  }
  function isWhitelisted() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [S.activeWlKey]: [] }, (result) => {
        const list = result[S.activeWlKey];
        if (!Array.isArray(list)) {
          resolve(false);
          return;
        }
        const canon = pageCanonicalHost();
        if (!canon) {
          resolve(false);
          return;
        }
        resolve(list.some((h) => (0, import_hostname2.hostsMatch)(h, canon)));
      });
    });
  }
  function trustDomain(hostname) {
    return new Promise((resolve) => {
      const key = (0, import_hostname2.normalizeHostname)(hostname);
      if (!key) {
        resolve();
        return;
      }
      chrome.storage.local.get({ [TRUSTED_DOMAINS_KEY]: {} }, (result) => {
        const map = trustedDomainsToMap(result[TRUSTED_DOMAINS_KEY]);
        map[key] = { ts: Date.now() };
        pruneStorageMap(map, TRUSTED_MAX_ENTRIES, Infinity);
        chrome.storage.local.set({ [TRUSTED_DOMAINS_KEY]: map }, resolve);
      });
    });
  }
  function showCountdownToast(hostname, seconds = 4) {
    return new Promise((resolve) => {
      S.firstVisitToastVisible = true;
      const host = document.createElement("div");
      const sr = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
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
      const toast = document.createElement("div");
      toast.className = "cg-toast";
      const headerRow = document.createElement("div");
      headerRow.className = "cg-header";
      const emojiSpan = document.createElement("span");
      emojiSpan.textContent = "\u{1F36A}";
      const titleSpan = document.createElement("span");
      titleSpan.className = "cg-title";
      titleSpan.textContent = chrome.i18n.getMessage("contentToastTitle");
      headerRow.appendChild(emojiSpan);
      headerRow.appendChild(titleSpan);
      const hostEl = document.createElement("div");
      hostEl.className = "cg-host";
      hostEl.textContent = hostname;
      const bodyEl = document.createElement("div");
      bodyEl.className = "cg-body";
      bodyEl.appendChild(document.createTextNode(chrome.i18n.getMessage("contentToastBodyPrefix")));
      const countEl = document.createElement("b");
      countEl.className = "cg-count";
      countEl.textContent = String(seconds);
      bodyEl.appendChild(countEl);
      bodyEl.appendChild(document.createTextNode(chrome.i18n.getMessage("contentToastBodySuffix")));
      const barBg = document.createElement("div");
      barBg.className = "cg-bar-bg";
      const bar = document.createElement("div");
      bar.className = "cg-bar";
      barBg.appendChild(bar);
      const btnRow = document.createElement("div");
      btnRow.className = "cg-btns";
      const btnAlways = document.createElement("button");
      btnAlways.className = "cg-always";
      btnAlways.textContent = chrome.i18n.getMessage("contentBtnAlwaysTrust");
      const btnSkip = document.createElement("button");
      btnSkip.className = "cg-skip";
      btnSkip.textContent = chrome.i18n.getMessage("contentBtnCancel");
      btnRow.appendChild(btnAlways);
      btnRow.appendChild(btnSkip);
      toast.appendChild(headerRow);
      toast.appendChild(hostEl);
      toast.appendChild(bodyEl);
      toast.appendChild(barBg);
      toast.appendChild(btnRow);
      sr.appendChild(style);
      sr.appendChild(toast);
      document.body.appendChild(host);
      const cleanup = () => {
        S.firstVisitToastVisible = false;
        try {
          document.body.removeChild(host);
        } catch (_) {
        }
      };
      let remaining = seconds;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.transition = `width ${seconds}s linear`;
          bar.style.width = "0%";
        });
      });
      const ticker = setInterval(() => {
        remaining--;
        if (countEl) countEl.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(ticker);
          cleanup();
          resolve("proceed");
        }
      }, 1e3);
      btnAlways.addEventListener("click", () => {
        clearInterval(ticker);
        cleanup();
        resolve("always");
      });
      btnSkip.addEventListener("click", () => {
        clearInterval(ticker);
        cleanup();
        resolve("skip");
      });
    });
  }
  function getApproval() {
    if (!S._domainApprovalPromise) {
      S._domainApprovalPromise = (async () => {
        if (!S.settings.firstVisitConfirm) return true;
        const trusted = await getTrustedDomains();
        const canon = pageCanonicalHost();
        if (canon && trusted.has(canon)) return true;
        const answer = await showCountdownToast(location.hostname);
        if (answer === "always") await trustDomain(location.hostname);
        return answer !== "skip";
      })();
    }
    return S._domainApprovalPromise;
  }
  async function scanIframes(intent) {
    const frames = Array.from(document.querySelectorAll("iframe"));
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc || !doc.body) continue;
        for (const profile of CMP_DICTIONARY) {
          const target = intent === "reject" ? profile.reject : profile.accept;
          for (const sel of target) {
            try {
              const btn = doc.querySelector(sel);
              if (btn && isVisible2(btn)) {
                log(`iframe CMP "${profile.name}" match: "${getLabel2(btn).slice(0, 40)}"`);
                return btn;
              }
            } catch (_) {
            }
          }
        }
        const iframeGsr = createShadowRootCache2();
        const el = findByHeuristic2(intent, doc.body, {}, iframeGsr);
        if (el) {
          log("iframe heuristic match");
          return el;
        }
      } catch (_) {
      }
    }
    return null;
  }
  async function scanContainerIframes(containerEl, intent, profile) {
    if (!containerEl) return null;
    const frames = Array.from(containerEl.querySelectorAll("iframe"));
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc || !doc.body) continue;
        if (profile) {
          const target = intent === "reject" ? profile.reject : profile.accept;
          for (const sel of target) {
            try {
              const btn = doc.querySelector(sel);
              if (btn && isVisible2(btn)) {
                log(`container-iframe "${profile.name}" match: "${getLabel2(btn).slice(0, 40)}"`);
                return btn;
              }
            } catch (_) {
            }
          }
        }
        const iframeGsr = createShadowRootCache2();
        const el = findByHeuristic2(intent, doc.body, {}, iframeGsr);
        if (el) {
          log("container-iframe heuristic match");
          return el;
        }
      } catch (_) {
      }
    }
    return null;
  }
  var _manageAttempts = /* @__PURE__ */ new Map();
  var MANAGE_COOLDOWN_MS = 2e3;
  var MANAGE_MAX_ATTEMPTS = 3;
  function canAttemptManage(key) {
    const entry = _manageAttempts.get(key);
    if (!entry) return true;
    if (entry.attempts >= MANAGE_MAX_ATTEMPTS) return false;
    if (Date.now() < entry.cooldownUntil) return false;
    return true;
  }
  function recordManageAttempt(key) {
    const entry = _manageAttempts.get(key) || { ts: 0, attempts: 0, cooldownUntil: 0 };
    entry.ts = Date.now();
    entry.attempts++;
    entry.cooldownUntil = Date.now() + MANAGE_COOLDOWN_MS;
    _manageAttempts.set(key, entry);
  }
  function isProfileContainerStillVisible(profile, getShadowRoots) {
    for (const sel of profile.containers || []) {
      try {
        const el = deepQuery2(sel, document, getShadowRoots);
        if (el && isVisible2(el)) return true;
      } catch (_) {
      }
    }
    for (const sel of profile.detect || []) {
      try {
        const el = deepQuery2(sel, document, getShadowRoots);
        if (el && isVisible2(el)) return true;
      } catch (_) {
      }
    }
    return false;
  }
  async function handleProfile(profile, getShadowRoots, effectivePref) {
    const containerFound = profile.containers.some((sel) => {
      try {
        return !!deepQuery2(sel, document, getShadowRoots);
      } catch (_) {
        return false;
      }
    });
    if (!containerFound) return false;
    const sr = getProfileShadowRoot2(profile);
    const want = effectivePref;
    log(`Matched: ${profile.name}${sr ? " [shadow]" : ""}`);
    const primary = want === "reject" ? profile.reject : profile.accept;
    const btn = queryFirst2(primary, document, sr, getShadowRoots);
    if (btn) {
      log(`${profile.name}: direct \u2192 "${getLabel2(btn)}"`);
      return await safeClick2(btn);
    }
    if (want === "reject" && profile.manage) {
      const manageGuardKey = `${profile.name}@${pageCanonicalHost() || location.hostname}`;
      if (canAttemptManage(manageGuardKey)) {
        const manageBtn = queryFirst2(profile.manage, document, sr, getShadowRoots);
        if (manageBtn) {
          log(`${profile.name}: opening manage panel\u2026`);
          await safeClick2(manageBtn);
          recordManageAttempt(manageGuardKey);
          await delay(profile.postClick ?? 800);
        }
      } else {
        log(`${profile.name}: manage click throttled (cooldown or max ${MANAGE_MAX_ATTEMPTS} attempts)`);
      }
      const newSr = getProfileShadowRoot2(profile);
      const reject = queryFirst2(profile.reject, document, newSr ?? sr, getShadowRoots);
      if (reject) {
        log(`${profile.name}: panel reject \u2192 "${getLabel2(reject)}"`);
        await safeClick2(reject);
        await delay(700);
        const confirm = queryFirst2(profile.reject, document, newSr ?? sr, getShadowRoots);
        if (confirm && confirm !== reject && isVisible2(confirm)) {
          log(`${profile.name}: secondary confirmation \u2192 "${getLabel2(confirm)}"`);
          await safeClick2(confirm);
        } else {
          const hRoot = newSr ?? sr ?? document;
          const hConfirm = findByHeuristic2("reject", hRoot, {}, getShadowRoots);
          if (hConfirm && hConfirm !== reject && isVisible2(hConfirm)) {
            log(`${profile.name}: secondary heuristic confirm \u2192 "${getLabel2(hConfirm)}"`);
            await safeClick2(hConfirm);
          }
        }
        if (isProfileContainerStillVisible(profile, getShadowRoots)) return false;
        return true;
      }
      const panelRoot = newSr ?? sr ?? document;
      const h = findByHeuristic2("reject", panelRoot, {}, getShadowRoots);
      if (h) {
        await safeClick2(h);
        await delay(700);
        const h2 = findByHeuristic2("reject", panelRoot, {}, getShadowRoots);
        if (h2 && h2 !== h && isVisible2(h2)) {
          log(`${profile.name}: secondary heuristic panel \u2192 "${getLabel2(h2)}"`);
          await safeClick2(h2);
        } else if (profile.manageFinalize) {
          const finalizeBtn = queryFirst2(profile.manageFinalize, document, newSr ?? sr, getShadowRoots);
          if (finalizeBtn && finalizeBtn !== h && isVisible2(finalizeBtn)) {
            log(`${profile.name}: heuristic finalize panel \u2192 "${getLabel2(finalizeBtn)}"`);
            await safeClick2(finalizeBtn);
          }
        }
        if (isProfileContainerStillVisible(profile, getShadowRoots)) return false;
        return true;
      }
      if (profile.manageFinalize) {
        const finalizeBtn = queryFirst2(profile.manageFinalize, document, newSr ?? sr, getShadowRoots);
        if (finalizeBtn) {
          log(`${profile.name}: finalize panel \u2192 "${getLabel2(finalizeBtn)}"`);
          await safeClick2(finalizeBtn);
          if (isProfileContainerStillVisible(profile, getShadowRoots)) return false;
          return true;
        }
      }
      return false;
    }
    const containerEl = profile.containers.reduce((found, sel) => {
      if (found) return found;
      try {
        return deepQuery2(sel, document, getShadowRoots);
      } catch (_) {
        return null;
      }
    }, null);
    if (containerEl) {
      const h = findByHeuristic2(want, containerEl, {}, getShadowRoots);
      if (h) return await safeClick2(h);
      if (profile.scanIframe) {
        const iframeBtn = await scanContainerIframes(containerEl, want, profile);
        if (iframeBtn) return await safeClick2(iframeBtn);
      }
    }
    return false;
  }
  async function genericClickWithVerify(targetEl, bannerEl) {
    if (!isConsentContext2(targetEl)) {
      log("Generic: skip candidate \u2014 not consent context");
      return false;
    }
    const clicked = await safeClick2(targetEl);
    if (!clicked) return false;
    if (!await didBannerDisappear2(bannerEl)) {
      log("Generic: banner still visible after click \u2014 not S.handled");
      return false;
    }
    return true;
  }
  async function handleGeneric(getShadowRoots, effectivePref) {
    if (isSearchEngineResultsPage2()) {
      log("Generic: skip \u2014 search engine results page");
      return false;
    }
    const want = effectivePref;
    const bannerSels = [
      '[id*="cookie"][id*="banner"]',
      '[id*="cookie"][id*="consent"]',
      '[id*="cookie"][id*="notice"]',
      '[id*="cookie"][id*="popup"]',
      '[id*="gdpr"]',
      '[id*="privacy-banner"]',
      '[class*="cookie-banner"]',
      '[class*="cookie-notice"]',
      '[class*="cookie-consent"]',
      '[class*="cookie-popup"]',
      '[class*="consent-banner"]',
      '[class*="consent-notice"]',
      '[class*="gdpr-banner"]',
      '[aria-label*="cookie" i]',
      '[aria-label*="consent" i]',
      '[aria-describedby*="cookie" i]',
      // Dialogs only when their label explicitly mentions cookies/consent
      '[role="dialog"][aria-label*="cookie" i]',
      '[role="dialog"][aria-label*="consent" i]',
      '[role="dialog"][aria-label*="privacy" i]',
      '[role="alertdialog"][aria-label*="cookie" i]'
    ];
    let bannerRoot = null;
    let usedBodyTextGateOnly = false;
    for (const sel of bannerSels) {
      try {
        const el2 = deepQuery2(sel, document, getShadowRoots);
        if (el2 && isVisible2(el2)) {
          bannerRoot = el2;
          break;
        }
      } catch (_) {
      }
    }
    if (!bannerRoot) {
      const candidateRoots = [];
      try {
        document.querySelectorAll('[role="dialog"], [role="alertdialog"], [aria-modal="true"]').forEach((el2) => {
          try {
            if (isVisible2(el2)) candidateRoots.push(el2);
          } catch (_) {
          }
        });
      } catch (_) {
      }
      const bodyText = (getScopedConsentText2(candidateRoots) || "").toLowerCase();
      const relevant = (
        // ── Unambiguous privacy/consent terms (any language) ──────
        bodyText.includes("gdpr") || // ── English ──────────────────────────────────────────────
        /cookie\s*(policy|notice|banner|consent|S.settings|preferences)/i.test(bodyText) || /\b(we|this\s+site|this\s+website)\s+use[sd]?\s+cookies?\b/i.test(bodyText) || /\buse[sd]?\s+cookies?\s+(to|for|in\s+order)\b/i.test(bodyText) || // ── Turkish ──────────────────────────────────────────────
        /çerez\s*(politikası|ayarları|tercih|bildirimi|kullan)/i.test(bodyText) || // ── German ───────────────────────────────────────────────
        bodyText.includes("datenschutz") || bodyText.includes("privatsph\xE4re") || /cookie[\s-]*(richtlinie|hinweis|einstellung)/i.test(bodyText) || /wir\s+verwenden\s+cookies/i.test(bodyText) || // ── French ───────────────────────────────────────────────
        /utilisons?\s+des?\s+cookies?/i.test(bodyText) || bodyText.includes("choix de cookies") || bodyText.includes("politique de cookies") || // ── Spanish ──────────────────────────────────────────────
        bodyText.includes("pol\xEDtica de cookies") || bodyText.includes("aviso de cookies") || /utilizamos\s+cookies/i.test(bodyText) || /usamos\s+cookies/i.test(bodyText) || // ── Italian ──────────────────────────────────────────────
        /informativa\s+sui\s+cookie/i.test(bodyText) || /politica\s+sui\s+cookie/i.test(bodyText) || /utilizziamo\s+(i\s+)?cookie/i.test(bodyText) || // ── Dutch ────────────────────────────────────────────────
        bodyText.includes("cookiebeleid") || bodyText.includes("cookiemelding") || /wij\s+gebruiken\s+cookies/i.test(bodyText) || // ── Portuguese ───────────────────────────────────────────
        bodyText.includes("aviso de cookies") || /usamos\s+cookies/i.test(bodyText) || // ── Polish ───────────────────────────────────────────────
        /polityka\s+(plików\s+)?cookie/i.test(bodyText) || /używamy\s+(plików\s+)?cookie/i.test(bodyText) || /stosujemy\s+pliki\s+cookie/i.test(bodyText) || // ── Swedish ──────────────────────────────────────────────
        bodyText.includes("cookiepolicy") || /vi\s+använder\s+(cookies|kakor)/i.test(bodyText) || bodyText.includes("kakpolicy") || // ── Norwegian ────────────────────────────────────────────
        bodyText.includes("informasjonskapsler") || /vi\s+bruker\s+(informasjons)?cookies/i.test(bodyText) || // ── Danish ───────────────────────────────────────────────
        bodyText.includes("cookiepolitik") || /vi\s+bruger\s+cookies/i.test(bodyText) || // ── Finnish ──────────────────────────────────────────────
        bodyText.includes("ev\xE4stek\xE4yt\xE4nt\xF6") || bodyText.includes("ev\xE4steseloste") || /käytämme\s+evästeitä/i.test(bodyText) || // ── Czech ────────────────────────────────────────────────
        /používáme\s+(soubory\s+)?cookie/i.test(bodyText) || /zásady\s+používání\s+cookie/i.test(bodyText) || // ── Slovak ───────────────────────────────────────────────
        /používame\s+(súbory\s+)?cookie/i.test(bodyText) || /zásady\s+používania\s+cookie/i.test(bodyText) || // ── Greek ────────────────────────────────────────────────
        /πολιτική\s+cookie/i.test(bodyText) || /χρησιμοποιούμε\s+cookies/i.test(bodyText) || // ── Romanian ─────────────────────────────────────────────
        /politica\s+de\s+cookie/i.test(bodyText) || /utilizăm\s+cookie/i.test(bodyText) || // ── Hungarian ────────────────────────────────────────────
        /cookie\s+szabályzat/i.test(bodyText) || /süti(ket|t)?\s+(szabályzat|használ)/i.test(bodyText) || // ── Japanese ─────────────────────────────────────────────
        bodyText.includes("\u30AF\u30C3\u30AD\u30FC\u30DD\u30EA\u30B7\u30FC") || bodyText.includes("\u30AF\u30C3\u30AD\u30FC\u3092\u4F7F\u7528") || /cookieの(使用|利用)/i.test(bodyText) || // ── Korean ───────────────────────────────────────────────
        bodyText.includes("\uCFE0\uD0A4 \uC815\uCC45") || bodyText.includes("\uCFE0\uD0A4\uB97C \uC0AC\uC6A9") || bodyText.includes("\uCFE0\uD0A4 \uC0AC\uC6A9") || // ── Chinese ──────────────────────────────────────────────
        /cookie\s*政策/i.test(bodyText) || /使用\s*cookie/i.test(bodyText) || bodyText.includes("\u9690\u79C1\u653F\u7B56") || // ── "consent" paired with cookie/privacy context (any language)
        /\bconsent\b/.test(bodyText) && (bodyText.includes("cookie") || bodyText.includes("privacy") || bodyText.includes("tracking") || bodyText.includes("\xE7erez"))
      );
      if (!relevant) return false;
      bannerRoot = document.body;
      usedBodyTextGateOnly = true;
      log("Generic: body-text gate passed (consent phrases detected)");
    }
    log("Generic: root =", bannerRoot.tagName, bannerRoot.id || "");
    const overlayHeuristicOpts = { skipEflCustom: true, rejectNavAnchors: true };
    if (usedBodyTextGateOnly) {
      if (!shouldRunGenericScan(false)) {
        log("Generic: overlay scan throttled");
        return false;
      }
      const overlays = gatherLikelyCookieOverlays2();
      if (!overlays.length) {
        log("Generic: body-text gate but no overlay/dialog candidate \u2014 skip");
        return false;
      }
      if (!await getApproval()) {
        log("First-visit confirmation: user cancelled \u2014 leaving banner untouched");
        return false;
      }
      for (const sub of overlays) {
        const el2 = findByHeuristic2(want, sub, overlayHeuristicOpts, getShadowRoots);
        if (el2 && await genericClickWithVerify(el2, sub)) return true;
      }
      const iframeEl2 = await scanIframes(want);
      if (iframeEl2 && await genericClickWithVerify(iframeEl2, iframeEl2)) return true;
      return false;
    }
    if (!await getApproval()) {
      log("First-visit confirmation: user cancelled \u2014 leaving banner untouched");
      return false;
    }
    const el = findByHeuristic2(want, bannerRoot, {}, getShadowRoots);
    if (el && await genericClickWithVerify(el, bannerRoot)) return true;
    const iframeEl = await scanIframes(want);
    if (iframeEl && await genericClickWithVerify(iframeEl, iframeEl)) return true;
    return false;
  }
  function resolveEffectivePref() {
    if (S.settings.preference === "moderate") {
      if (Date.now() < S.moderateRejectUntilTs) return "reject";
      if (!S.moderateFallingBack) {
        S.moderateFallingBack = true;
        log("Moderate mode: reject-first window elapsed \u2014 falling back to accept");
      }
      return "accept";
    }
    return S.settings.preference;
  }
  async function loadHostHints() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [HOST_HINTS_KEY]: {} }, (s) => {
        S.hostHints = s[HOST_HINTS_KEY] || {};
        S.hostHintsLoaded = true;
        resolve();
      });
    });
  }
  function persistHostDismissalHint(payload) {
    const host = pageCanonicalHost();
    if (!host) return;
    chrome.storage.local.get({ [HOST_HINTS_KEY]: {} }, (s) => {
      const next = { ...s[HOST_HINTS_KEY] || {} };
      next[host] = { ...payload, v: 1, ts: Date.now() };
      pruneStorageMap(next, HINT_MAX_ENTRIES, HINT_TTL_MS);
      S.hostHints = next;
      chrome.storage.local.set({ [HOST_HINTS_KEY]: next });
    });
  }
  async function attemptHandle(getShadowRoots, effectivePref, gen) {
    if (S.handled || !S.settings.enabled) return;
    if (gen !== S.generation) return;
    if (!getShadowRoots) getShadowRoots = createShadowRootCache2();
    if (S.settings.preference === "moderate" && effectivePref === "reject") {
      S.moderateRejectPassCount++;
      if (S.settings.debugMode) {
        const remaining = Math.max(0, S.moderateRejectUntilTs - Date.now());
        console.log(`[CG] Moderate pass #${S.moderateRejectPassCount}, ${remaining}ms remaining`);
      }
      log(`Moderate: reject-seek pass #${S.moderateRejectPassCount}`);
    }
    if (!S.hostHintFastPathTried) {
      S.hostHintFastPathTried = true;
      if (!S.hostHintsLoaded) await loadHostHints();
      if (gen !== S.generation) return;
      const hintCanon = pageCanonicalHost();
      const hint = hintCanon ? S.hostHints[hintCanon] : null;
      if (hint && hint.v === 1) {
        log("Host hint fast path:", hint);
        try {
          let ok = false;
          if (hint.kind === "cmp" && hint.profile) {
            const prof = CMP_DICTIONARY.find((p) => p.name === hint.profile);
            if (prof) ok = await handleProfile(prof, getShadowRoots, effectivePref);
          } else if (hint.kind === "generic") {
            ok = await handleGeneric(getShadowRoots, effectivePref);
          }
          if (ok) {
            if (gen !== S.generation) return;
            persistHostDismissalHint(
              hint.kind === "cmp" ? { kind: "cmp", profile: hint.profile } : { kind: "generic" }
            );
            markHandled();
            return;
          }
        } catch (err) {
          warn("Host hint fast path:", err);
        }
      }
    }
    for (const profile of CMP_DICTIONARY) {
      if (gen !== S.generation) return;
      try {
        if (await handleProfile(profile, getShadowRoots, effectivePref)) {
          if (gen !== S.generation) return;
          persistHostDismissalHint({ kind: "cmp", profile: profile.name });
          markHandled();
          return;
        }
      } catch (err) {
        warn(`Profile "${profile.name}":`, err);
      }
    }
    if (gen !== S.generation) return;
    try {
      if (await handleGeneric(getShadowRoots, effectivePref)) {
        if (gen !== S.generation) return;
        persistHostDismissalHint({ kind: "generic" });
        markHandled();
        return;
      }
    } catch (err) {
      warn("Generic handler:", err);
    }
  }
  async function runDetectionPass(gen) {
    if (S.handled || !S.settings.enabled) return;
    if (gen !== S.generation) return;
    const effectivePref = resolveEffectivePref();
    const getShadowRoots = createShadowRootCache2();
    await attemptHandle(getShadowRoots, effectivePref, gen);
    if (gen !== S.generation) return;
    attachToNewShadowRoots(getShadowRoots);
  }
  async function runDetectionPassGuarded() {
    if (S.detectionInFlight) {
      S.pendingPass = true;
      return;
    }
    S.detectionInFlight = true;
    const currentGeneration = S.generation;
    try {
      await runDetectionPass(currentGeneration);
    } finally {
      S.detectionInFlight = false;
    }
    if (S.pendingPass && S.generation === currentGeneration) {
      S.pendingPass = false;
      queueMicrotask(() => {
        void runDetectionPassGuarded();
      });
    }
  }
  function disableDetection() {
    S.generation++;
    stopPolling();
    stopObserver();
    S.pendingPass = false;
    S.detectionInFlight = false;
  }
  function reArmDetection() {
    S.generation++;
    S.pendingPass = false;
    S.detectionInFlight = false;
    startObserver();
    startPolling();
  }
  function markHandled() {
    S.handled = true;
    stopPolling();
    stopObserver();
    log("Banner dismissed \u2713");
    try {
      chrome.runtime.sendMessage({ type: "BANNER_HANDLED" }).catch(() => {
      });
    } catch (_) {
    }
  }
  function onMutation() {
    if (S.handled) {
      stopObserver();
      return;
    }
    clearTimeout(S.debounceTimer);
    S.debounceTimer = setTimeout(async () => {
      try {
        await runDetectionPassGuarded();
      } catch (err) {
        warn("runDetectionPassGuarded:", err);
      }
    }, DEBOUNCE_MS);
  }
  function attachObserverTo(root) {
    if (!root || observerMap.has(root)) return;
    const observer = new MutationObserver(onMutation);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden", "open"]
    });
    observerMap.set(root, observer);
    log("Observing", root === document ? "document" : "a shadow root");
  }
  function attachToNewShadowRoots(getShadowRoots = null) {
    const roots = getShadowRoots ? getShadowRoots(document) : collectShadowRoots2(document);
    for (const sr of roots) {
      if (!observerMap.has(sr)) attachObserverTo(sr);
    }
  }
  function startObserver() {
    if (observerMap.size > 0) return;
    attachObserverTo(document);
    attachToNewShadowRoots();
    log("MutationObserver system ready");
  }
  function stopObserver() {
    clearTimeout(S.debounceTimer);
    for (const [, observer] of observerMap) {
      observer.disconnect();
    }
    observerMap.clear();
  }
  function startPolling() {
    S.pollingTimer = setInterval(async () => {
      if (S.handled || S.retryCount >= MAX_RETRY) {
        stopPolling();
        return;
      }
      S.retryCount++;
      await runDetectionPassGuarded();
    }, 500);
    log(`Polling started (max ${MAX_RETRY} \xD7 500 ms = ${MAX_RETRY * 500 / 1e3} s)`);
  }
  function stopPolling() {
    clearInterval(S.pollingTimer);
    log(`Polling stopped (retries used: ${S.retryCount}/${MAX_RETRY})`);
  }
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        { preference: "moderate", enabled: true, showNotifications: true, debugMode: false, firstVisitConfirm: false },
        (stored) => {
          Object.assign(S.settings, stored);
          resolve();
        }
      );
    });
  }
  async function handleSettingsUpdate() {
    await loadSettings();
    const isPrivate = await getTabContext();
    S.activeWlKey = isPrivate ? WL_KEY_PRIVATE : WL_KEY_NORMAL;
    const host = (0, import_hostname2.normalizeHostname)(location.hostname);
    if (!host) {
      return;
    }
    S.pageWhitelisted = await isWhitelisted();
    if (S.pageWhitelisted) {
      S.handled = true;
      disableDetection();
      log("Storage change: page whitelisted \u2014 halting");
      return;
    }
    if (!S.settings.enabled) {
      disableDetection();
      log("Disabled \u2014 monitoring stopped");
      return;
    }
    S.handled = false;
    S.retryCount = 0;
    S.moderateRejectPassCount = 0;
    S.moderateFallingBack = false;
    if (S.settings.preference === "moderate") {
      S.moderateRejectUntilTs = Date.now() + 4e3;
    }
    S.hostHintFastPathTried = false;
    S._domainApprovalPromise = null;
    clearSessionGuard();
    reArmDetection();
    await runDetectionPassGuarded();
  }
  async function handleRuntimeMessage(msg) {
    if (msg.type === "WHITELIST_UPDATED") {
      S.pageWhitelisted = await isWhitelisted();
      if (S.pageWhitelisted) {
        log(`Whitelist: ${location.hostname} added \u2014 halting`);
        S.handled = true;
        disableDetection();
      } else if (S.settings.enabled) {
        log(`Whitelist: ${location.hostname} removed \u2014 re-arming`);
        S.handled = false;
        S.retryCount = 0;
        S.moderateRejectPassCount = 0;
        S.moderateFallingBack = false;
        if (S.settings.preference === "moderate") {
          S.moderateRejectUntilTs = Date.now() + 4e3;
        }
        S.hostHintFastPathTried = false;
        S._domainApprovalPromise = null;
        clearSessionGuard();
        reArmDetection();
        await runDetectionPassGuarded();
      }
      return;
    }
    if (msg.type !== "SETTINGS_UPDATED" || !msg.settings) return;
    const wasDisabled = !S.settings.enabled;
    Object.assign(S.settings, msg.settings);
    log("Settings updated live:", S.settings);
    if (S.settings.enabled && !S.pageWhitelisted && (wasDisabled || S.handled)) {
      S.handled = false;
      S.retryCount = 0;
      S.moderateRejectPassCount = 0;
      S.moderateFallingBack = false;
      if (S.settings.preference === "moderate") {
        S.moderateRejectUntilTs = Date.now() + 4e3;
      }
      S.hostHintFastPathTried = false;
      S._domainApprovalPromise = null;
      clearSessionGuard();
      reArmDetection();
      await runDetectionPassGuarded();
    } else if (!S.settings.enabled) {
      disableDetection();
      log("Disabled \u2014 monitoring stopped");
    }
  }
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "GET_POPUP_SITE_STATUS") {
      queueMicrotask(() => {
        try {
          sendResponse({
            ok: true,
            handled: S.handled,
            pageWhitelisted: S.pageWhitelisted,
            enabled: S.settings.enabled,
            retryExhausted: !S.handled && S.retryCount >= MAX_RETRY,
            firstVisitToastVisible: Boolean(S.firstVisitToastVisible)
          });
        } catch (_) {
          sendResponse({ ok: false });
        }
      });
      return true;
    }
    void handleRuntimeMessage(msg);
    return false;
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" && areaName !== "local") return;
    if (areaName === "local" && changes[HOST_HINTS_KEY]) {
      void loadHostHints();
    }
    if (areaName === "local" && changes[TRUSTED_DOMAINS_KEY]) {
      S._domainApprovalPromise = null;
    }
    let relevant = false;
    if (areaName === "sync") {
      for (const k of SETTINGS_SYNC_KEYS) {
        if (changes[k]) relevant = true;
      }
    }
    if (areaName === "local") {
      if (changes[WL_KEY_NORMAL] || changes[WL_KEY_PRIVATE]) relevant = true;
    }
    if (relevant) {
      void handleSettingsUpdate();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void handleSettingsUpdate();
    }
  });
  function getTabContext() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "GET_TAB_CONTEXT" }, (response) => {
        resolve(response?.incognito ?? false);
      });
    });
  }
  async function init() {
    await loadSettings();
    await migrateStoredHostnames();
    if (!S.settings.enabled) {
      log("Disabled \u2014 standing by");
      return;
    }
    await pruneAllStorageOnStartup();
    await loadHostHints();
    const isPrivate = await getTabContext();
    S.activeWlKey = isPrivate ? WL_KEY_PRIVATE : WL_KEY_NORMAL;
    log(`Context: ${isPrivate ? "InPrivate" : "Normal"} \u2014 using key "${S.activeWlKey}"`);
    S.pageWhitelisted = await isWhitelisted();
    if (S.pageWhitelisted) {
      log(`Whitelisted \u2014 skipping ${location.hostname}`);
      return;
    }
    const priorClicks = getSessionClicks();
    if (priorClicks >= MAX_SESSION_CLICKS) {
      log(`\u26A0 Reload-loop guard: ${priorClicks} clicks on ${location.hostname} within ${GUARD_WINDOW_MS / 1e3}s \u2014 standing down`);
      S.handled = true;
      return;
    }
    log(`Ready | pref="${S.settings.preference}" | ${location.hostname}`);
    if (S.settings.preference === "moderate") {
      S.moderateRejectUntilTs = Date.now() + 4e3;
      S.moderateRejectPassCount = 0;
      S.moderateFallingBack = false;
    }
    await runDetectionPassGuarded();
    if (!S.handled) {
      startObserver();
      startPolling();
    }
  }
  void init();
})();
