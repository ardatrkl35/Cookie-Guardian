# Cookie Guardian — release notes (audit hardening track)

**Current build:** **v1.2.0 Beta** — `manifest.json` `version` `1.2.0`, `version_name` `v1.2.0 Beta` (2026-04-18).

Summarizes the phased hardening / audit work completed for Cookie Guardian. Extension version in `manifest.json` remains the shipping version line for stores.

## Phase 1 — Security & critical correctness (P0)

- **Whitelist hardening (JOB_01):** Strict hostname normalization, caps, storage migration on read, and DOM-safe whitelist rendering (no HTML injection from stored or typed values).
- **Iframe click context (JOB_02):** Synthetic clicks use the element’s owner `Window` / `MouseEvent` so same-origin iframe CMPs behave correctly; visibility checks use the correct document default view.
- **Heuristic safety (JOB_03):** Consent-context gating, commerce / navigation guards, and post-click verification before treating generic dismissals as success.

## Phase 2 — Reliability, performance & accessibility (P1)

- **Observer lifecycle (JOB_04):** Map-based observers with clean disconnect / re-arm semantics.
- **Moderate mode (JOB_05):** Wall-clock reject window instead of fragile pass-count cutoff.
- **Manage panel (JOB_06):** Throttling and visibility checks to avoid false “handled” when the panel never resolves.
- **Hot path (JOB_07):** Narrower consent text scans, throttled generic passes, and cheaper DOM walks where applicable.
- **Popup a11y (JOB_08):** Roles, labels, focus-visible, reduced-motion, and structural fixes for keyboard and AT users.
- **Popup concurrency (JOB_09):** Guards on report generation and settings / whitelist writes.
- **Least privilege (JOB_10):** Manifest permissions trimmed to `activeTab`, `storage`, `tabs`; docs aligned.
- **Detection single-flight (JOB_11):** Prevents overlapping detection passes and stale generation races.

## Phase 3 — Maintainability & hardening (P2)

- **Storage retention (JOB_12):** TTL and max entries for hints, trusted domains, and reports.
- **Hostname normalization (JOB_13):** Shared `shared/hostname.js` across popup, content bundle, and background.
- **Settings propagation (JOB_14):** `chrome.storage.onChanged`, safer tab messaging, visibility resync.
- **Tests & CI (JOB_15):** Node unit tests, ESLint, GitHub Actions (`lint` / `test` jobs with build gate).
- **Modularization (JOB_16):** `content/src/*` modules + esbuild IIFE → single `content/content.js` for the manifest.
- **Trust & transparency UX (JOB_17):** Site status, trusted/hints panels, clear-local-metadata, whitelist undo toast, content↔popup status messaging.

## Phase 4 — Backlog & future (P3)

- **All-frames eval (JOB_18):** Evaluated and **rejected** (`all_frames` stays false); documented rationale (cost, duplicate observers, coordination).
- **Icon fallback (JOB_19):** Canvas overlay path with badge fallback when drawing or `setIcon` fails.
- **Localization (JOB_20):** `_locales/en/messages.json`, manifest `__MSG_*__`, popup strings via `chrome.i18n`, content toast i18n.
- **CMP data pipeline (JOB_21):** Versioned `data/cmp-profiles.json`; dictionary imports JSON via esbuild bundle.

---

*For day-to-day changes, see `CHANGELOG.md` and git history.*
