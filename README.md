# 🍪 Cookie Guardian

> Automatically detects and dismisses cookie consent banners based on your preferred settings — silently, instantly, on every website you visit.

![Version](https://img.shields.io/badge/version-1.2.0_BETA-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-brightgreen)
![Platform](https://img.shields.io/badge/platform-Edge_%2F_Chrome-0078D4)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Privacy](https://img.shields.io/badge/data_collected-none-success)

---

## What It Does

Cookie Guardian runs quietly in the background on every website you visit. The moment a cookie consent banner appears, it reads your saved preference and automatically clicks the right button — so you never have to.

Three modes to choose from:

| Mode | Behaviour |
|---|---|
| **Reject All** | Always clicks the reject / necessary-only button |
| **Moderate Reject** | Tries to reject first; accepts only if no reject option exists |
| **Accept All** | Always clicks the accept button |

---

## Features

- **50+ supported CMPs** — OneTrust, Cookiebot, Usercentrics, Didomi, TrustArc, CookieYes, Iubenda, Axeptio, Sourcepoint, HubSpot, and many more
- **Shadow DOM piercing** — handles CMPs rendered inside Web Components
- **Efficient detection** — within each detection pass, shadow roots are discovered once and reused for all queries, avoiding repeated full-document walks that hurt performance on large pages
- **Repeat-visit hints (optional)** — after a banner is dismissed successfully, the extension may store which strategy worked for that hostname (e.g. known CMP profile vs generic path) in `chrome.storage.local`. On the next visit it tries that path first; if the banner is not cleared, it automatically runs the full detection pipeline so site changes or A/B tests still work
- **Same-origin iframe scanning** — catches banners loaded inside frames (Termly, Cookiebot hosted)
- **21-language heuristics** — English, Turkish, German, French, Spanish, Italian, Dutch, Portuguese, Polish, Swedish, Norwegian, Danish, Finnish, Czech, Slovak, Greek, Romanian, Hungarian, Japanese, Korean, Chinese
- **Reload-loop guard** — detects when clicks cause page reloads and automatically stands down
- **Instant enable/disable** — the master toggle in the header saves immediately and takes effect without a page reload; turning it off halts all active DOM monitoring on the tab
- **Auto-save** — default preference and option toggles persist shortly after you change them (no separate Save button)
- **Dark mode** — optional dark appearance for the extension popup only (stored locally, not synced)
- **Site whitelist** — add the current site or type a domain to **never** run Cookie Guardian on those hostnames; manage the list in the collapsible **Whitelisted Sites** section. In **InPrivate** windows, a separate list applies (badge in the section title); it is cleared when the last InPrivate window closes
- **Live settings sync** — changes relay to the active tab’s content script immediately
- **Activity badge** — optional ✅ overlay on the toolbar icon when a banner is handled
- **Confirm on new sites** — optional countdown toast before auto-clicking when the site is matched only by heuristics (not a known CMP); auto-proceeds after 4 seconds. **Always trust** on the toast remembers that hostname so the prompt is not shown again (separate from the whitelist)
- **Debug mode** — verbose DevTools console logging for troubleshooting
- **Report broken site** — one-click button to open a pre-filled GitHub issue for any site where the extension misbehaves; rate-limited locally (1 report per hostname per 24 h, max 5 per day) to deter abuse
- **No telemetry** — no analytics or background uploads; optional **Report broken site** opens GitHub in your browser only when you click it

---

## All settings (popup)

| Setting | What it does | Storage |
|---|---|---|
| **Enable / Disable** (header toggle) | Master switch; when off, the main area is dimmed and the extension does not scan or click on the page | `chrome.storage.sync` |
| **Reject All / Moderate Reject / Accept All** | Default action when dismissing banners | `chrome.storage.sync` |
| **Dark mode** | Light or dark popup theme | `chrome.storage.local` |
| **Show activity badge** | Brief ✅ on the toolbar icon after a banner is handled | `chrome.storage.sync` |
| **Confirm on new sites** | Countdown toast on heuristic-only matches; known CMPs stay silent | `chrome.storage.sync` |
| **Whitelist current site** | Add or remove the active tab’s hostname from the whitelist | `chrome.storage.local` |
| **Whitelisted Sites** | Expandable list: type a domain and add, or remove entries — these sites are skipped entirely by the extension | `chrome.storage.local` (separate key in InPrivate) |
| **Debug logging** | Extra `[CookieGuardian]` messages in the page console | `chrome.storage.sync` |
| **Report broken site** | Opens GitHub with hostname + version pre-filled (subject to rate limits) | Rate-limit map in `chrome.storage.local` |
| **Per-host dismissal hint** | Speeds repeat visits by trying the last successful approach once per load, then full detection if needed | `chrome.storage.local` — hostname + strategy metadata only; never synced; cleared on uninstall |

---

## Supported CMP Platforms

<details>
<summary>Click to expand the full list</summary>

**Commercial CMPs**
- OneTrust / OneTrust Preference Centre
- Cookiebot / Usercentrics / Didomi
- CookieYes (Cookie Law Info) / Iubenda / Osano
- InMobi Quantcast / Termly / Axeptio
- Complianz (WP) / Borlabs Cookie (WP)
- TrustArc / Consentmanager.net
- GDPR Cookie Compliance (Moove) / Cookie Notice (Humanity)
- Real Cookie Banner / Crownpeak Evidon
- Securiti AI / DataGrail / Ketch / Civic UK
- Illow / PiwikPro CMP / Cookie Information (Danish)
- Sourcepoint / HubSpot / CookieConsent (Orest Bida)
- Klaro / WP GDPR Cookie Notice / CookieHub / Metomic
- Admiral VRM / Cassie (Syrenis) / Commanders Act (TrustCommander)

**Ecosystem-specific**
- Amazon SP-CC (Amazon, IMDB, Prime Video, Audible, Ring)
- Twitch Consent

**Government & Public Sector**
- EU Cookie Consent Kit (europa.eu, ec.europa.eu, eur-lex, europarl)
- European Parliament Cookie Banner
- etracker Consent (German federal sites — bund.de, bmj.de, destatis.de)
- Bundesregierung.de custom TYPO3 banner
- Bundestag.de custom banner
- ARD / ZDF / German public broadcasting (MDR, NDR, WDR, HR)
- GOV.UK Design System Cookie Banner

**Financial Sector**
- Danske Bank custom banner
- Generic financial sector patterns

</details>

---

## Installation

### From the Microsoft Edge Add-ons Store

Install **[Cookie Guardian from the Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj)** and click **Get**.

### Manual installation (Load unpacked)

1. **Either** unzip an **[end-user release](#end-user-release-zip)** folder (the directory that contains `manifest.json` next to `popup/`, `content/`, etc.) **or** clone this repository and use the repo root only if you have already run `npm run build` so `content/content.js` exists.

   ```bash
   git clone https://github.com/ardatrkl35/Cookie-Guardian.git
   ```

2. **Open** Microsoft Edge and go to `edge://extensions/` (Chrome: `chrome://extensions/`).

3. Turn **Developer mode** on.

4. Click **Load unpacked** and choose the folder that **directly contains** `manifest.json` (for a release zip, that is the inner folder, e.g. `cookie-guardian-1.2.0-Beta`, not the outer `.zip` file).

5. The Cookie Guardian icon appears in the toolbar; open it to set your preference.

---

## Usage

1. Click the **Cookie Guardian** icon in your browser toolbar.
2. Use the **header toggle** to enable or disable the extension — it saves and applies immediately.
3. Under **Default Preference**, choose **Reject All**, **Moderate Reject**, or **Accept All**. Your choice is saved automatically after a short moment.
4. Under **Options**:
   - **Dark mode** — dark theme for the popup only
   - **Show activity badge** — flash a ✅ when a banner is handled
   - **Confirm on new sites** — countdown toast for sites matched only by heuristics; use **Always trust** on the toast to skip future prompts for that hostname (this is not the same as whitelisting)
   - **Whitelist current site** — **Add** / **Remove** the active site so Cookie Guardian never runs there
   - **Debug logging** — detailed logs in the DevTools console for the page
5. Expand **Whitelisted Sites** to add domains manually or remove whitelisted entries. In InPrivate, the badge shows which list you are editing; that list is discarded when you close all InPrivate windows.

> **Tip:** With **Confirm on new sites** enabled, recognised CMP platforms (OneTrust, Cookiebot, etc.) are handled silently — the countdown appears for banners caught only by the heuristic fallback.

---

## Whitelist vs “Always trust”

- **Whitelist** — Cookie Guardian does **nothing** on that hostname (no scanning, no clicks). Managed in the popup.
- **Always trust** (on the countdown toast) — only skips the confirmation toast for that hostname; the extension still dismisses banners as usual when **Confirm on new sites** is on.

---

## Reporting a Broken Site

If Cookie Guardian fails to dismiss a banner, misbehaves, or causes issues on a specific site, click the **Report broken site** button in the popup. This opens a pre-filled GitHub issue in a new tab containing the site's hostname and your extension version — no full URLs, paths, or personal data are ever included.

Reporting requires a GitHub account, which acts as a natural barrier against spam. Additionally, rate limiting is enforced locally:

- Maximum **1 report per hostname per 24 hours**
- Maximum **5 unique hostnames reported per 24-hour window**

These limits are stored on your device only and reset automatically after 24 hours.

---

## Project structure

Layout matches the **[end-user release zip](#end-user-release-zip)** (what you load in **Load unpacked**). Source files such as `content/src/` and `data/cmp-profiles.json` exist **only in the Git repository** for development; they are **not** in the published folder.

```
cookie-guardian-…/               # e.g. cookie-guardian-1.2.0-Beta (folder inside the zip)
├── manifest.json                # MV3 manifest (version, permissions, locales)
├── INSTALL.txt                  # Short “Load unpacked” instructions (release zip only)
├── _locales/                    # Localized strings (e.g. en/messages.json)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js                 # Settings, whitelist, report, i18n
├── background/
│   └── service-worker.js        # Defaults, messaging, toolbar icon, InPrivate whitelist cleanup
├── content/
│   └── content.js               # Bundled content script (CMP + heuristics; built from src in repo)
├── shared/
│   └── hostname.js              # Hostname parsing (used by the popup)
├── LICENSE                      # MIT (release zip)
├── README.md                    # This file (release zip)
├── CHANGELOG.md                 # Version history (release zip)
├── PRIVACY_POLICY.md            # Full privacy policy (release zip)
└── RELEASE_NOTES.md             # Phase / release notes (release zip)
```

**Developer checkout (not shipped in the zip):** `package.json`, `content/src/*.js`, `data/cmp-profiles.json`, `.eslintrc.json`, `.github/`, etc. Run `npm install` and `npm run build` before loading from a clone, or use `npm run package:zip` to produce the tree above.

---

## How It Works

```
┌──────────────┐   Toggle / options   ┌────────────────────┐
│  Popup UI    │ ──────────────────► │ chrome.storage     │
│  popup.js    │    (auto-save)      │ .sync + .local     │
└──────┬───────┘                     └─────────┬──────────┘
       │                                     │ get()
       │ sendMessage                         ▼
       ▼                           ┌──────────────────────┐
┌──────────────────┐               │  Content script      │
│ Service worker   │ ── relay ──► │  content.js          │
│ service-worker.js│               │  • load settings     │
└──────────────────┘               │  • skip if off / WL  │
                                   │  • observe DOM       │
                                   │  • optional hint     │
                                   │  • CMP + heuristics  │
                                   │  • confirm toast     │
                                   │  • click / verify    │
                                   └──────────────────────┘
```

On each page:
1. The **content script** loads your saved preferences from `chrome.storage.sync` and checks whitelist / InPrivate context in `chrome.storage.local`.
2. If the hostname is **whitelisted**, the extension exits and does not monitor the page.
3. Otherwise it scans the DOM for known CMP containers. **Shadow-root discovery** for piercing is **batched per detection pass** so the same walk is not repeated for every selector.
4. If a **per-host dismissal hint** is stored (see Features), the extension may try that **narrow path first** on early passes; if the banner is not dismissed, it **falls back** to the full CMP list and generic heuristics — same end state as today.
5. If a known CMP is found, it uses precise selectors to click the correct button — silently, with no confirmation prompt.
6. If no known CMP matches, a **multilingual heuristic scorer** scans clickable elements using regex pattern banks across 21 languages.
7. If **Confirm on new sites** is enabled and the hostname is not in the always-trusted list, a **countdown toast** appears for 4 seconds before the heuristic click. You can **Cancel**, **Always trust**, or wait for auto-proceed.
8. A **MutationObserver** watches for banners injected after page load (async loaders, SPAs).
9. A **polling fallback** runs every 500 ms for up to 40 seconds as a belt-and-suspenders layer.
10. When a banner is handled, the service worker briefly animates the toolbar icon (if the activity badge option is on). A successful dismiss may **refresh** the per-host hint for the next visit.
11. If the master toggle is turned **off**, the content script stops observers and polling until re-enabled.

---

## Privacy

Cookie Guardian collects **no personal data** for analytics or remote logging.

- All banner detection and clicking run **locally** in your browser.
- The extension does **not** upload browsing history, full URLs, page content, or usage telemetry.
- Core preferences use `chrome.storage.sync` (optional browser sync between your own signed-in devices, handled by the browser vendor).
- Popup **Dark mode**, hostname lists (whitelist, always-trusted, InPrivate whitelist), and **per-host dismissal hints** (strategy metadata after a successful dismiss) use `chrome.storage.local` and are **not** uploaded by the extension.
- **Report broken site** opens GitHub with a **pre-filled hostname and version string** only if you click the button; anything further is under GitHub’s policies. Local **rate-limit** entries for reports stay on your device (see table below).
- No third-party analytics SDKs or tracking pixels are bundled.

**Local storage retention** (`chrome.storage.local` host metadata only):

| Key | TTL | Max entries |
|-----|-----|-------------|
| Per-host dismissal hints (`cg_host_dismissal_hints`) | 30 days | 500 |
| Always-trusted domains (`cg_trusted_domains`) | No expiry | 200 |
| Report rate-limit records (`reports`) | 7 days | 100 |

Older hint/report rows and excess trusted hostnames are pruned on extension startup (content script) and when new data is written. Report checks in the popup also prune before applying the 24-hour / daily rate limits.

See [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) for the full policy.

---

## Permissions Explained

| Permission | Reason |
|---|---|
| `activeTab` | Access the active tab for whitelist/state checks (e.g. hostname in the popup, settings relay to the content script) |
| `storage` | Persist user preferences and whitelist (plus theme, always-trusted hosts, and local report rate limits via `chrome.storage`) |
| `tabs` | Query tab state for toolbar icon updates and for report URL construction (`chrome.tabs.query` / `chrome.tabs.create`) |
| `host_permissions: <all_urls>` | Cookie banners appear on any website; the content script must run everywhere (except whitelisted hostnames, where it exits early) |

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Microsoft Edge (Chromium) | Fully supported — [Edge Add-ons listing](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj) |
| Google Chrome | Fully supported (manual load or future store) |
| Brave, Opera, Vivaldi | Compatible (Chromium-based) |
| Firefox | Not supported (requires MV2 port) |
| Safari | Not supported |

---

## End-user release zip

From a dev checkout (`npm install` once), run:

```bash
npm run package:zip
```

This runs `npm run build`, then writes **`dist/cookie-guardian-<label>/`** (for example **`cookie-guardian-1.2.0-Beta`**, where `<label>` is derived from `manifest.version` and `manifest.version_name`) with everything Chrome needs to **Load unpacked**: `manifest.json`, `content/content.js`, `popup/`, `background/`, `icons/`, `_locales/`, `shared/`, plus root **`*.md`**, **`LICENSE`**, and **`INSTALL.txt`**. A matching **`dist/cookie-guardian-<label>.zip`** is created for sharing.

Recipients do **not** need Node.js; they unzip and load the inner folder in `chrome://extensions`.

---

## Contributing

Contributions are welcome. If you find a website whose cookie banner is not handled correctly:

1. Click the **Report broken site** button in the Cookie Guardian popup — this opens a pre-filled GitHub issue with the site hostname and your extension version already filled in.
2. Alternatively, open DevTools (`F12`), enable **Debug logging** in the popup, reload the page, and check the console for `[CookieGuardian]` messages.
3. Note the CMP platform name (often visible in the DOM or network tab) and include it in the issue.

To add support for a new CMP, add a profile object to `data/cmp-profiles.json`, then run `npm install` (once) and `npm run build` so `content/content.js` bundles the update. Ensure valid JSON and match the shape expected by `content/src/cmp-dictionary.js` (`validateProfile`).

---

## Changelog

### v1.2.0 Beta (2026-04-18)
- **CMP data pipeline:** Profiles live in `data/cmp-profiles.json`; rebuild the content bundle with `npm run build` after edits.
- **Versioning:** Manifest `version` 1.2.0 with `version_name` **v1.2.0 Beta**; popup footer and issue reports use the display string.

### v1.1.1 (2026-04-05)
- **Performance:** Batched shadow-root discovery **once per detection pass** (`createShadowRootCache`) — all `deepQuery` / `deepQueryAll` calls reuse the same root list; `attachToNewShadowRoots` reuses that list after each pass (no second full-document walk).
- **Repeat visits:** **Per-host dismissal hints** (`cg_host_dismissal_hints` in `chrome.storage.local`) — one fast path per page load from the last successful CMP or generic strategy, with **automatic fallback** to the full CMP + generic pipeline if the banner is not cleared.

### v1.1.0 (2026-03-30 — 2026-04-03)
- **Published** on [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj)
- **New:** Site whitelist (current site + managed list); separate InPrivate whitelist cleared when the last InPrivate window closes
- **New:** Dark mode for the popup (`chrome.storage.local`)
- **New:** "Report broken site" — pre-filled GitHub issue with hostname; rate-limited locally (1/hostname/24 h, 5/day)
- **Change:** Preference and option toggles auto-save (no Save Settings button)
- **Fix:** Master toggle takes effect immediately; disabling stops MutationObserver and polling on the tab
- **Fix:** Disabled overlay scoped to main content so the header toggle stays usable

### v1.0 (Initial BETA)
- Initial public release

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgements

CMP selector data compiled from publicly observable DOM structures across 50+ consent management platforms. Multilingual pattern banks cover 21 languages to handle consent banners globally.

---

*Cookie Guardian v1.2.0 Beta · MV3 · Edge / Chrome*
