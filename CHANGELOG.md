# Changelog

All notable changes to **Cookie Guardian** are documented in this file.

The format is loosely inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] — 2026-03-30 to 2026-04-03

### Added

- Published on [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/cookie-guardian/hjjpapclkmjdndigcafkcmadkcjfmclj).
- **Site whitelist** — whitelist the current site from the popup, manage domains in the collapsible **Whitelisted Sites** section (add manually or remove entries).
- **InPrivate whitelist** — separate whitelist while browsing InPrivate; shown with a context badge in the popup; cleared automatically when the last InPrivate window closes.
- **Dark mode** — optional dark appearance for the extension popup; stored in `chrome.storage.local` (not synced).
- **Report broken site** — opens a pre-filled GitHub issue with the active tab’s hostname and extension version; local rate limits (1 report per hostname per 24 hours, max 5 unique hostnames per day).

### Changed

- **Auto-save** — default preference and option toggles persist shortly after you change them; the separate **Save Settings** button was removed as redundant.

### Fixed

- **Master toggle** — takes effect immediately without requiring Save; turning the extension off stops the MutationObserver and polling interval on the active tab.
- **Disabled overlay** — limited to the main popup content so the header enable/disable switch stays clickable.

### Documentation

- **`PRIVACY_POLICY.md`** and **`README.md`** updated for all popup settings, storage keys (`theme`, `cg_trusted_domains`, `cg_whitelisted_domains`, `cg_whitelisted_domains_private`, `reports`), whitelist vs always-trusted behaviour, and the Edge Add-ons listing.

---

## [1.0.0] — Initial BETA

- Initial public release.

---

**Source:** [github.com/ardatrkl35/Cookie-Guardian](https://github.com/ardatrkl35/Cookie-Guardian)
