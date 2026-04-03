# Privacy Policy — Cookie Guardian

**Extension Name:** Cookie Guardian  
**Version:** 1.1.0 (BETA)  
**Platform:** Microsoft Edge (Manifest V3) — [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj) · Google Chrome (manual install)  
**Last Updated:** April 3, 2026  

---

## 1. Introduction

Cookie Guardian is a browser extension that automatically detects and dismisses cookie consent banners on websites you visit, based on your chosen preference (Reject All, Moderate Reject, or Accept All). Its sole purpose is to reduce friction caused by cookie consent popups and to help you exercise your privacy choices consistently and automatically.

This Privacy Policy explains what data the extension accesses, how it uses that data, and your rights as a user. Cookie Guardian is designed from the ground up with a privacy-first architecture: **all processing happens locally on your device and no data is ever transmitted to external servers by the extension itself.**

---

## 2. Data Collection

**Cookie Guardian does not collect, process, store, transmit, or share any personal data.**

No information about you, your identity, your browsing habits, the websites you visit, or any content on those websites is ever sent off your device by the extension.

The following table describes every piece of information the extension interacts with, where it comes from, and what happens to it:

| Data | Source | Purpose | Leaves your device? |
|---|---|---|---|
| User preference (`reject` / `moderate` / `accept`) | You, via the popup | Determines which type of consent button to click | **No** |
| Master enable/disable toggle state | You, via the popup | Turns the extension on or off; takes effect instantly | **No** |
| "Show activity badge" toggle state | You, via the popup | Controls toolbar icon feedback when a banner is handled | **No** |
| "Confirm on new sites" toggle state | You, via the popup | Controls whether a countdown toast appears before auto-clicking on unrecognised (heuristic) sites | **No** |
| "Debug logging" toggle state | You, via the popup | Enables verbose console logs in DevTools | **No** |
| "Dark mode" toggle state | You, via the popup | Stores whether the extension popup uses a dark appearance | **No** — stored only in `chrome.storage.local`; not synced |
| **Always-trusted** hostname list (`cg_trusted_domains`) | You, when you click **Always trust** in the countdown toast | Remembers hostnames for which the confirmation toast must not be shown again | **No** — stored only in `chrome.storage.local`; never synced or transmitted |
| **Whitelisted** hostname lists (`cg_whitelisted_domains` and, in InPrivate windows, `cg_whitelisted_domains_private`) | You, via **Whitelist current site**, manual add in **Whitelisted Sites**, or remove actions | Hostnames where the extension does not run at all (no scanning, no clicks) | **No** — stored only in `chrome.storage.local`; the InPrivate list is removed automatically when the last InPrivate window is closed |
| Report rate-limit record (hostname + timestamp) | Automatically written when you click "Report broken site" | Enforces the per-hostname and daily report caps to prevent abuse | **No** — stored only in `chrome.storage.local`; never synced or transmitted; expires and is pruned after 24 hours |
| Current page hostname (e.g. `example.com`) | Your browser's current tab | Used internally to detect reload loops, evaluate whitelist and always-trusted lists, drive the whitelist UI, and pre-fill the site hostname in a bug report | **No** — only the hostname (never the full URL, path, or query string) is used, and only locally |
| Click counter per hostname | Computed in-memory / `sessionStorage` | Prevents the extension from entering an infinite click-reload loop | **No** — `sessionStorage` is local to the browser tab and is cleared when the tab is closed |
| Page DOM structure | The website you are visiting | Scanned locally to detect and interact with cookie consent banners | **No** — read-only, never stored or transmitted |
| Page body text | The website you are visiting | Used to confirm a consent-related phrase is present before acting | **No** — read-only, never stored or transmitted |

### What is explicitly NOT collected

- Browsing history  
- Full URLs of pages visited (only the hostname is ever used, and only locally)  
- Cookies themselves (the extension clicks buttons; it does not read, write, or transmit cookies)  
- Passwords or form data  
- Any personally identifiable information (PII)  
- Device identifiers  
- IP addresses  
- Telemetry or usage analytics  

---

## 3. How Settings Are Stored

Cookie Guardian uses two browser storage APIs, both entirely local to your device:

**`chrome.storage.sync`** — stores your five core preference values: `preference`, `enabled`, `showNotifications`, `debugMode`, and `firstVisitConfirm`. If you are signed into Microsoft Edge or Google Chrome with sync enabled, these preferences may be synchronised across your own signed-in devices via the browser vendor's secure sync infrastructure (Microsoft or Google). This synchronisation is handled entirely by the browser and is governed by the respective vendor's privacy policy — Cookie Guardian has no visibility into or control over this process.

**`chrome.storage.local`** — stores data that stays on the device (or, for the InPrivate whitelist, only for the duration of InPrivate sessions as described below):

1. **Popup theme** (`theme`) — `"light"` or `"dark"` from the **Dark mode** toggle. Affects only the popup’s appearance. Never synced.

2. **Always-trusted hostnames** (`cg_trusted_domains`) — written only when you click **Always trust** on the countdown toast while **Confirm on new sites** is on. Used only to skip that toast on future visits to the same hostname. Distinct from the whitelist (below).

3. **Whitelisted hostnames** (`cg_whitelisted_domains`) — normal browsing profile. Sites on this list are completely ignored by the extension until you remove them.

4. **InPrivate whitelist** (`cg_whitelisted_domains_private`) — separate list used only in InPrivate / incognito windows. When the last InPrivate window is closed, this key is deleted automatically so whitelists from private sessions do not persist.

5. **Report rate-limit records** (`reports`) — a mapping of hostname to timestamp written automatically each time you submit a bug report via the **Report broken site** button. Used solely to enforce the rate limit (1 report per hostname per 24 hours, 5 unique hostnames per day). Records older than 24 hours are pruned automatically the next time the popup runs a report check. If you have never used the report button, this key may never be written.

---

## 4. "Report Broken Site" Feature

The popup contains a **Report broken site** button. When clicked:

1. The extension reads the **hostname** of the currently active tab (e.g. `example.com`). The full URL, path, query string, and any other page information are never accessed for this purpose.
2. A local rate-limit check is performed against `chrome.storage.local`. If the daily cap is exceeded or the hostname was already reported within the past 24 hours, the report is blocked and the user is notified.
3. If the check passes, a record is written to `chrome.storage.local` (hostname + current timestamp).
4. Your browser navigates to a **GitHub issue creation page** (`https://github.com/ardatrkl35/Cookie-Guardian/issues/new`) with a pre-filled title and body containing the hostname and the extension version number. **This navigation is performed by your browser — the extension does not make any direct network request.** Once you are on GitHub, GitHub's own privacy policy and terms of service apply.

**What the pre-filled report contains:**
- The site hostname (e.g. `example.com`)
- The Cookie Guardian version number
- A structured template with placeholder fields for you to fill in

**What the pre-filled report does NOT contain:**
- Full page URL, path, or query string
- Your name, email address, or any personal identifier
- Browsing history
- Any data from the page DOM

Filing the issue on GitHub requires a GitHub account. This is intentional — it acts as a natural barrier against spam and automated abuse.

---

## 5. Permissions — Justification for Each

The following permissions are declared in `manifest.json`. Each one is required for a specific, functional reason:

### `activeTab`
**Why it is needed:** When you change settings in the popup, the extension needs to identify the currently active browser tab so it can relay updated settings to the content script running on that page. Also used to read the current tab's hostname for whitelist display and when you click **Report broken site.**

### `storage`
**Why it is needed:** Required to read and write preference settings via `chrome.storage.sync` and to read and write popup theme, always-trusted hostnames, whitelists (normal and InPrivate), and report rate-limit records via `chrome.storage.local`. This is the only persistent data the extension stores and it never leaves your device through the extension itself.

### `scripting`
**Why it is needed:** Required by Manifest V3 to support programmatic interaction with web page content. This permission enables the extension's content script framework to operate correctly across all supported page contexts, including those that require dynamic script injection at the browser engine level.

### `tabs`
**Why it is needed:** Used by the background service worker to:  
  1. Query the currently active tab (`chrome.tabs.query`) in order to forward updated settings to the content script on that tab after you change options or the master toggle.  
  2. Identify the originating tab ID when a banner is dismissed (`sender.tab.id`), so the toolbar icon overlay animation can be applied to the correct tab via `chrome.action.setIcon`.  
  3. Open the GitHub issue URL in a new tab when you click **Report broken site.**

### `host_permissions: <all_urls>`
**Why it is needed:** Cookie consent banners appear on virtually any website. The content script must be injected on all URLs to be able to detect and dismiss banners wherever they appear. No data from any of these pages is recorded or transmitted — the content script only reads the DOM locally to find and click consent buttons (except on hostnames you have whitelisted, where it does not run).

---

## 6. Third-Party Services & External Requests

Cookie Guardian makes **no requests to any external server, API, or third-party service.**

The only network-like call made by the extension itself is an internal fetch of the file `icons/icon128.png` from within the extension's own package (using `chrome.runtime.getURL`), used exclusively to draw the animated toolbar icon overlay. This call never reaches the internet.

The **"Report broken site"** feature causes your browser to navigate to `https://github.com/ardatrkl35/Cookie-Guardian/issues/new`. This is a standard browser navigation — not a request made by the extension — and is only triggered by explicit user action (clicking the button). Once you are on GitHub, [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement) applies. Filing an issue is voluntary and requires a GitHub account.

No analytics SDKs, tracking pixels, advertising networks, or remote logging services of any kind are included in or used by this extension.

---

## 7. Data Sharing & Sale

Cookie Guardian does not share, sell, rent, trade, or otherwise disclose any user data to any third party, because no user data is collected in the first place.

---

## 8. Data Security

Because Cookie Guardian stores only a small number of preference values, optional hostname lists (always-trusted and whitelists), popup theme, and temporary report rate-limit records locally on your device, and transmits nothing externally, the security surface area is minimal by design. All data is stored using the browser's native, sandboxed `chrome.storage` APIs and is protected by the browser's own security model and, where applicable, your browser account credentials. Neither storage location is accessible to web pages or other extensions.

---

## 9. Children's Privacy

Cookie Guardian does not knowingly collect any information from anyone, including children under the age of 13 (or the applicable age of digital consent in your jurisdiction). Because no personal data is collected at all, the extension poses no risk to the privacy of minors.

---

## 10. Changes to This Privacy Policy

If a future update to Cookie Guardian introduces any material change to how data is handled, this Privacy Policy will be updated accordingly, and the "Last Updated" date at the top of this document will be revised. Significant changes will be noted in the extension's version release notes.

---

## 11. Your Rights (GDPR & Applicable Law)

If you are located in the European Economic Area (EEA), the United Kingdom, or another jurisdiction with applicable data protection law, you have the right to access, correct, or delete any personal data held about you. **Since Cookie Guardian does not collect or store any personal data, there is no personal data to access, correct, or delete.** Your only stored data is your own preference settings, theme, hostname lists you created, and locally-managed rate-limit records, which you can change or clear at any time.

To remove all data stored by the extension:
1. Open the extension popup and adjust or clear lists as desired, or  
2. To clear specific local keys, open the browser's DevTools on any page, open the **Application** tab, navigate to **Extension Storage → Local**, and delete the relevant keys (`theme`, `cg_trusted_domains`, `cg_whitelisted_domains`, `cg_whitelisted_domains_private`, `reports`), or  
3. Uninstall Cookie Guardian — this will remove all locally stored preferences, lists, theme, and report rate-limit records.

---

## 12. Contact

If you have any questions or concerns about this Privacy Policy or the behaviour of Cookie Guardian, please contact:

**Developer / Publisher:** Cookie Guardian  
**Email:** `arda.ege.turkeli@gmail.com`  
**Microsoft Edge Add-ons:** [Cookie Guardian on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj)  
**Bug Reports:** Use the **Report broken site** button in the extension popup, or open an issue directly at `https://github.com/ardatrkl35/Cookie-Guardian`  

---

*This privacy policy was written to comply with the requirements of the [Microsoft Edge Add-ons Developer Policies](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/store-policies/developer-policies), the General Data Protection Regulation (GDPR — EU 2016/679), and the UK Data Protection Act 2018.*
