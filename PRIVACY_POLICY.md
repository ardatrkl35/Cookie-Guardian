# Privacy Policy — Cookie Guardian

**Extension Name:** Cookie Guardian  
**Version:** 1.0 BETA  
**Platform:** Microsoft Edge (Manifest V3) / Google Chrome  
**Last Updated:** March 29, 2026  

---

## 1. Introduction

Cookie Guardian is a browser extension that automatically detects and dismisses cookie consent banners on websites you visit, based on your chosen preference (Reject All, Moderate Reject, or Accept All). Its sole purpose is to reduce friction caused by cookie consent popups and to help you exercise your privacy choices consistently and automatically.

This Privacy Policy explains what data the extension accesses, how it uses that data, and your rights as a user. Cookie Guardian is designed from the ground up with a privacy-first architecture: **all processing happens locally on your device and no data is ever transmitted to external servers.**

---

## 2. Data Collection

**Cookie Guardian does not collect, process, store, transmit, or share any personal data.**

No information about you, your identity, your browsing habits, the websites you visit, or any content on those websites is ever sent off your device.

The following table describes every piece of information the extension interacts with, where it comes from, and what happens to it:

| Data | Source | Purpose | Leaves your device? |
|---|---|---|---|
| User preference (`reject` / `moderate` / `accept`) | You, via the popup | Determines which type of consent button to click | **No** |
| Master enable/disable toggle state | You, via the popup | Turns the extension on or off | **No** |
| "Show activity badge" toggle state | You, via the popup | Controls toolbar icon feedback | **No** |
| "Debug logging" toggle state | You, via the popup | Enables verbose console logs in DevTools | **No** |
| Current page hostname (e.g. `example.com`) | Your browser's current tab | Used internally to detect reload loops on a per-site basis | **No** |
| Click counter per hostname | Computed in-memory / `sessionStorage` | Prevents the extension from entering an infinite click-reload loop | **No** — `sessionStorage` is local to the browser tab and is cleared when the tab is closed |
| Page DOM structure | The website you are visiting | Scanned locally to detect and interact with cookie consent banners | **No** — read-only, never stored or transmitted |
| Page body text | The website you are visiting | Used to confirm a consent-related phrase is present before acting | **No** — read-only, never stored or transmitted |

### What is explicitly NOT collected

- Browsing history  
- URLs of pages visited  
- Cookies themselves (the extension clicks buttons; it does not read, write, or transmit cookies)  
- Passwords or form data  
- Any personally identifiable information (PII)  
- Device identifiers  
- IP addresses  
- Telemetry or usage analytics  

---

## 3. How Settings Are Stored

Your four preference values (`preference`, `enabled`, `showNotifications`, `debugMode`) are saved using the browser's built-in **`chrome.storage.sync`** API. This API stores data locally in your browser profile and, if you are signed into Microsoft Edge or Google Chrome with sync enabled, your preferences may be synchronised across your own signed-in devices via the browser vendor's secure sync infrastructure (Microsoft or Google). This synchronisation is handled entirely by the browser and is governed by the respective vendor's privacy policy — Cookie Guardian has no visibility into or control over this process.

---

## 4. Permissions — Justification for Each

The following permissions are declared in `manifest.json`. Each one is required for a specific, functional reason:

### `activeTab`
**Why it is needed:** When you save new settings in the popup, the extension needs to identify the currently active browser tab so it can immediately relay the updated settings to the content script running on that page. Without this permission, your preference changes would not take effect until the next page load.

### `storage`
**Why it is needed:** Required to read and write your four preference settings (`preference`, `enabled`, `showNotifications`, `debugMode`) via `chrome.storage.sync`. This is the only persistent data the extension stores and it never leaves your device through the extension itself.

### `scripting`
**Why it is needed:** Required by Manifest V3 to support programmatic interaction with web page content. This permission enables the extension's content script framework to operate correctly across all supported page contexts, including those that require dynamic script injection at the browser engine level.

### `tabs`
**Why it is needed:** Used by the background service worker to:  
  1. Query the currently active tab (`chrome.tabs.query`) in order to forward updated settings to the content script on that tab after you press "Save Settings."  
  2. Identify the originating tab ID when a banner is dismissed (`sender.tab.id`), so the toolbar icon overlay animation can be applied to the correct tab via `chrome.action.setIcon`.

### `host_permissions: <all_urls>`
**Why it is needed:** Cookie consent banners appear on virtually any website. The content script must be injected on all URLs to be able to detect and dismiss banners wherever they appear. No data from any of these pages is recorded or transmitted — the content script only reads the DOM locally to find and click consent buttons.

---

## 5. Third-Party Services & External Requests

Cookie Guardian makes **no requests to any external server, API, or third-party service.** The only network-like call made by the extension is an internal fetch of the file `icons/base128.png` from within the extension's own package (using `chrome.runtime.getURL`), used exclusively to draw the animated toolbar icon overlay. This call never reaches the internet.

No analytics SDKs, tracking pixels, advertising networks, or remote logging services of any kind are included in or used by this extension.

---

## 6. Data Sharing & Sale

Cookie Guardian does not share, sell, rent, trade, or otherwise disclose any user data to any third party, because no user data is collected in the first place.

---

## 7. Data Security

Because Cookie Guardian stores only four boolean/string preference values locally on your device and transmits nothing externally, the security surface area is minimal by design. Your preferences are stored using the browser's native, sandboxed `chrome.storage.sync` mechanism, which is protected by the browser's own security model and, where applicable, your browser account credentials.

---

## 8. Children's Privacy

Cookie Guardian does not knowingly collect any information from anyone, including children under the age of 13 (or the applicable age of digital consent in your jurisdiction). Because no personal data is collected at all, the extension poses no risk to the privacy of minors.

---

## 9. Changes to This Privacy Policy

If a future update to Cookie Guardian introduces any material change to how data is handled, this Privacy Policy will be updated accordingly, and the "Last Updated" date at the top of this document will be revised. Significant changes will be noted in the extension's version release notes.

---

## 10. Your Rights (GDPR & Applicable Law)

If you are located in the European Economic Area (EEA), the United Kingdom, or another jurisdiction with applicable data protection law, you have the right to access, correct, or delete any personal data held about you. **Since Cookie Guardian does not collect or store any personal data, there is no personal data to access, correct, or delete.** Your only stored data is your own preference settings, which you can change or clear at any time directly within the extension popup or by uninstalling the extension.

To remove all data stored by the extension:
1. Open the extension popup and toggle the settings as desired, or
2. Uninstall Cookie Guardian — this will remove all locally stored preferences.

---

## 11. Contact

If you have any questions or concerns about this Privacy Policy or the behaviour of Cookie Guardian, please contact:

**Developer / Publisher:** Cookie Guardian  
**Email:** `arda.ege.turkeli@gmail.com`  
**Support / Bug Reports:** `https://github.com/ardatrkl35/Cookie-Guardian`  

---

*This privacy policy was written to comply with the requirements of the [Microsoft Edge Add-ons Developer Policies](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/store-policies/developer-policies), the General Data Protection Regulation (GDPR — EU 2016/679), and the UK Data Protection Act 2018.*
