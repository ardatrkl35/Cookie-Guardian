# 🍪 Cookie Guardian

> Automatically detects and dismisses cookie consent banners based on your preferred settings — silently, instantly, on every website you visit.

![Version](https://img.shields.io/badge/version-1.0_BETA-blue)
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
- **Same-origin iframe scanning** — catches banners loaded inside frames (Termly, Cookiebot hosted)
- **21-language heuristics** — English, Turkish, German, French, Spanish, Italian, Dutch, Portuguese, Polish, Swedish, Norwegian, Danish, Finnish, Czech, Slovak, Greek, Romanian, Hungarian, Japanese, Korean, Chinese
- **Reload-loop guard** — detects when clicks cause page reloads and automatically stands down
- **Live settings sync** — changes in the popup take effect instantly without a page reload
- **Activity badge** — optional ✅ overlay on the toolbar icon when a banner is handled
- **Confirm on new sites** — optional countdown toast before auto-clicking on sites not yet in your trusted list; auto-proceeds after 4 seconds so there is no friction on legitimate sites
- **Debug mode** — verbose DevTools console logging for troubleshooting
- **Zero data collection** — nothing leaves your device, ever

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

### From the Microsoft Edge Add-ons Store *(coming soon)*
Search for **Cookie Guardian** in the [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/) and click **Get**.

### Manual Installation (Developer Mode)

1. **Download or clone** this repository:
   ```bash
   git clone https://github.com/ardatrkl35/Cookie-Guardian.git
   ```

2. **Open** Microsoft Edge and navigate to `edge://extensions/`  
   *(For Chrome, navigate to `chrome://extensions/`)*

3. **Enable Developer Mode** using the toggle in the top-right corner.

4. Click **Load unpacked** and select the `cookie-guardian` folder.

5. The Cookie Guardian icon will appear in your toolbar. Click it to configure your preference.

---

## Usage

1. Click the **Cookie Guardian** icon in your browser toolbar.
2. Select your preferred mode:
   - **Reject All** — recommended for maximum privacy
   - **Moderate Reject** — best balance of privacy and compatibility
   - **Accept All** — useful if certain sites break without full cookie acceptance
3. Toggle optional settings:
   - **Show activity badge** — flash a ✅ badge when a banner is handled
   - **Confirm on new sites** — show a brief countdown toast on sites not yet trusted; auto-proceeds after 4 seconds, giving you time to cancel if something looks off
   - **Debug logging** — output detailed logs to the DevTools console
4. Click **Save Settings**.

Your preference applies immediately to the current tab and to all future pages you visit.

> **Tip:** "Confirm on new sites" is off by default. When enabled, known CMP platforms (OneTrust, Cookiebot, etc.) are always handled silently — the countdown only appears for banners detected by the heuristic fallback on sites that do not use a recognised CMP.

---

## Project Structure

```
cookie-guardian/
├── manifest.json              # Extension manifest (MV3)
├── icons/
│   ├── icon16.png             # Toolbar icon (16×16)
│   ├── icon48.png             # Extension management icon (48×48)
│   └── icon128.png            # Store listing icon (128×128)
├── popup/
│   ├── popup.html             # Toolbar popup markup
│   ├── popup.css              # Popup styles (dark theme)
│   └── popup.js               # Popup logic — loads/saves settings
├── background/
│   └── service-worker.js      # MV3 service worker — install defaults, message routing, icon overlay
├── content/
│   └── content.js             # Content script — CMP detection, DOM interaction, heuristics
├── PRIVACY_POLICY.md          # Full privacy policy
└── README.md                  # This file
```

---

## How It Works

```
 ┌──────────────┐   Save Settings   ┌────────────────────┐
 │  Popup UI    │ ───────────────►  │  chrome.storage    │
 │  popup.js    │                   │  .sync             │
 └──────────────┘                   └────────────────────┘
        │ sendMessage                        │ get()
        ▼                                    ▼
 ┌──────────────────┐             ┌──────────────────────┐
 │ Service Worker   │             │   Content Script     │
 │ service-worker   │ ──relay──►  │   content.js         │
 │ .js              │             │                      │
 └──────────────────┘             │  1. Load settings    │
                                  │  2. Watch DOM (MutationObserver) │
                                  │  3. Match CMP profile │
                                  │  4. Pierce Shadow DOM │
                                  │  5. Click button     │
                                  └──────────────────────┘
```

On each page:
1. The **content script** loads your saved preferences from `chrome.storage.sync`.
2. It immediately scans the DOM for known CMP containers.
3. If a known CMP is found, it uses its precise selectors to click the correct button — always silently, with no confirmation prompt.
4. If no known CMP matches, a **multilingual heuristic scorer** scans all clickable elements using regex pattern banks across 21 languages.
5. If "Confirm on new sites" is enabled and the site is not yet trusted, a **countdown toast** appears for 4 seconds before the click. The user can cancel, always-trust, or simply do nothing and let it proceed automatically.
6. A **MutationObserver** watches for banners injected after page load (async loaders, SPAs).
7. A **polling fallback** runs every 500 ms for up to 40 seconds as a belt-and-suspenders layer.
8. When a banner is handled, the service worker briefly animates the toolbar icon.

---

## Privacy

Cookie Guardian collects **no personal data whatsoever.**

- All processing is local to your device.
- No browsing data, page content, or usage analytics are ever transmitted.
- Your preference settings are stored via `chrome.storage.sync` (your own browser's sync, between your own devices).
- If "Confirm on new sites" is enabled, the list of hostnames you have marked as "Always trust" is stored locally via `chrome.storage.local` and never synced or transmitted.
- No third-party SDKs, analytics, or tracking of any kind are included.

See [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) for the full policy.

---

## Permissions Explained

| Permission | Reason |
|---|---|
| `activeTab` | Identify the current tab to relay updated settings immediately after you save |
| `storage` | Save and read your preference settings |
| `scripting` | Required by Manifest V3 for content script interaction with page contexts |
| `tabs` | Find the active tab and apply the toolbar icon animation to the correct tab |
| `host_permissions: <all_urls>` | Cookie banners appear on any website; the content script must run everywhere |

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Microsoft Edge (Chromium) | Fully supported |
| Google Chrome | Fully supported |
| Brave, Opera, Vivaldi | Compatible (Chromium-based) |
| Firefox | Not supported (requires MV2 port) |
| Safari | Not supported |

---

## Contributing

Contributions are welcome. If you find a website whose cookie banner is not handled correctly:

1. Open DevTools (`F12`) and enable **Debug logging** in the Cookie Guardian popup.
2. Reload the page and check the console for `[CookieGuardian]` messages.
3. Note the CMP platform name (often visible in the DOM or network tab).
4. Open an issue with the site URL, CMP name, and any relevant DOM selectors.

To add support for a new CMP, add an entry to the `CMP_DICTIONARY` array in `content/content.js` following the existing pattern.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## Acknowledgements

CMP selector data compiled from publicly observable DOM structures across 50+ consent management platforms. Multilingual pattern banks cover 21 languages to handle consent banners globally.

---

*Cookie Guardian v1.0 BETA · MV3 · Edge / Chrome*
