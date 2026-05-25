# Backlog

This backlog tracks near-term product and engineering work. Temporary implementation notes can live in `planning/` and should be promoted or removed once the work is complete.

## Current Focus

### Status Snapshot

Last documentation pass: May 25, 2026.

- Completed roadmap slices: Trust And Acceptance, For You / Attention Surface, Bubble-Style Detail Sheets, Specialist Cards, and Graph Analytics.
- In-progress roadmap slices: Presence And Household Context, Tablet / Kiosk Mode, Adaptive Text Readability, live generated-dashboard acceptance, and Keep Our Edge quality guardrails.
- Latest local validation after the Keep Our Edge guardrail pass: `npm run check`, `npm test -- --run`, `npm run build`, `npm run test:visual`, and `npm run test:e2e` passed. Visual smoke covers dashboard, library, attention, presence, settings, music, meals, weather, and calendar under a simulated Home Assistant ingress path across desktop, tablet, and phone viewports, including page overflow, visible text escaping its container, card content fitting vertically inside card surfaces, key label contrast, screenshot-sampled image-label contrast, image-label protection checks, and navigation/action overlap checks.
- Known local visual-test noise: Supervisor DNS warnings are expected outside the Home Assistant add-on runtime and did not fail the smoke suite.
- Recent targeted fixes: card editor and entity detail side sheets are now hosted by the root app shell so reusable card actions work outside `/dashboard`; navigation-card edit controls now share the shortcut action row instead of overlapping top-right shortcuts; a library navigation-card visual regression now proves shortcuts and edit controls stay separated; visual smoke now catches visible text escaping local containers and the Settings tab bar now handles long translated labels; kiosk mode now has optional browser wake-lock support with Settings status; production CSP no longer allows `unsafe-eval` and add-on mode now gets a narrowed default policy; the presence route now surfaces compact setup hints and discovers more commute/travel-time sensors; Home Assistant to-do cards no longer visibly churn from broad state polling; the library route now has live specialist-card examples; AH export review preserves grouped Mealie source lines before deduplicated export.
- New quality guardrails: `/library` is now the required design-system workshop, `docs/ADDING_FEATURE_OR_CARD.md` defines feature/card/readability/backend-state gates, visual smoke expands to library/weather/calendar, and a browser-state policy test flags new localStorage-style state unless it is explicitly allowed.
- Latest adaptive-readability pass: the weather hero now uses the shared `.readable-image-surface` contract with local label stacks and edge gradients instead of a full black video overlay.
- Latest generated-dashboard gate: a focused generator acceptance test now validates HA area-picture priority, deterministic fallback room previews, generated metadata/state, background scrims, and missing-area-picture quality hints across a house dashboard and related room dashboards.
- Latest music/radio guardrail: country radio tests now verify stale weekly catalogs render immediately while Radio Browser refreshes in the background, preserving the fast radio tab without accepting permanently stale station lists.
- Latest meals/AH polish: the AH review sheet now shows product-search failures per ingredient row, keeps rows exportable as free text, labels empty product matches, and prevents selecting non-orderable products.
- Latest add-on release guardrail: unit coverage now verifies Home Assistant add-on manifest/version/changelog alignment, required ingress settings, `/data` persistence, GHCR image metadata, and repository metadata.
- Latest add-on proxy guardrail: server-side Supervisor proxy and catch-all add-on route tests now verify add-on browser-token gating, Supervisor core URL construction, missing-token failures, stripped browser-only headers, query/body forwarding, and that upstream Home Assistant calls receive only `SUPERVISOR_TOKEN`, never the browser placeholder token.
- Latest security guardrail: hook-level tests now verify hardened production CSP/security headers, report-only CSP env flags, and cross-origin API mutation blocking.
- Latest proxy security guardrail: `/api/ha-proxy` now rejects absolute/protocol-relative paths, dot-segment escapes, unsupported resource paths, and invalid configured HA origins before forwarding authorization headers; `/ha-history` validates/encodes timestamp path segments, rejects non-HTTP(S) HA origins, and keeps production error responses generic.
- Latest WebSocket security guardrail: the add-on WebSocket proxy now rejects cross-origin browser upgrades unless explicitly allowed and closes the connection if the first browser frame is not valid add-on auth, so only the initial harmless browser token is rewritten to `SUPERVISOR_TOKEN`.
- Latest standalone auth guardrail: Home Assistant OAuth tokens are no longer durably stored in browser `localStorage`; standalone tokens are migrated into an ignored server-side `ha-sessions.json` session store behind an HttpOnly cookie, image/media/history proxy requests use that server session, and the standalone Home Assistant WebSocket now connects through `/api/ha-websocket` with a harmless browser token that is rewritten server-side.
- Latest abuse-prevention guardrail: server-wide API rate limits now cover auth/session, upload, heavy import, external search, and proxy paths; uploads use opaque filenames and are served with private cache plus nosniff headers.
- Latest OAuth cleanup guardrail: standalone Home Assistant OAuth now starts through a server-owned flow, exchanges the callback code server-side, stores the resulting tokens in the HttpOnly session store, and revokes the refresh token on disconnect when Home Assistant accepts revocation.
- Latest outbound-request guardrail: browser-assisted recipe imports now apply the public-internet URL/DNS policy to every Chromium request and recipe image download, Mealie base URLs reject embedded credentials, and the Buienradar rain proxy forwards only numeric lat/lon values to its fixed upstream endpoint.
- Latest dependency-audit guardrail: release audit now reports zero vulnerabilities after pinning SvelteKit's transitive `cookie` dependency to patched `0.7.2` through an npm override.
- Latest CSP guardrail: standalone production CSP now defaults to hardened same-origin connect/image rules, with `DASHBOARD_CSP_MODE=compat` kept as an explicit trusted-local escape hatch.
- Latest lock-screen guardrail: enabled lock screen no longer starts locked on every reload; the app starts usable and locks only after the configured idle timeout, with focused store tests and a Playwright navigation/weather smoke check.
- Latest readability guardrail: image-backed navigation cards and the library workshop example now expose the shared `.readable-image-surface` contract in addition to their local gradients and label stacks.
- Latest card-sizing guardrail: visual smoke now checks that visible card content fits vertically inside card surfaces; this caught and fixed the weather sun/twilight tile and compact navigation-card sizing.
- Latest library guardrail: a static card-library test now fails when a dashboard card type exists in the schema but has no add-card library entry.

### Open Work Summary

This is the current short list of what is still genuinely open.

Priority security development:

- Completed first slice: harden Home Assistant proxy boundaries before broader product work continues.
- `/api/ha-proxy` rejects absolute/protocol-relative paths, dot-segment escapes, unsupported HA resource paths, and invalid configured HA origins before forwarding authorization headers.
- `/ha-history` validates and encodes the timestamp path segment, rejects non-HTTP(S) HA origins, preserves only the intended Host header, and avoids returning stack traces or internal fetch details in production responses.
- Completed second slice: harden add-on WebSocket upgrade and first-auth handling.
- Add-on WebSocket upgrades now reject cross-origin browser `Origin` values unless the origin matches the request host/proxy host or is listed in `DASHBOARD_WS_ALLOWED_ORIGINS`.
- The add-on WebSocket proxy now closes invalid first browser frames before forwarding commands upstream; only a valid initial add-on browser auth frame is rewritten to `SUPERVISOR_TOKEN`.
- Completed third slice: move durable standalone Home Assistant OAuth token storage out of browser storage and into a server-side session file protected by an HttpOnly cookie.
- Legacy `hass_tokens` browser storage is adopted into the server session once, then removed from `localStorage`.
- Completed fourth slice: standalone `/api/ha-proxy` and `/ha-history` can now authenticate from the HttpOnly server session, so image/media/history fetches no longer need browser-supplied HA bearer headers or `x-ha-url`.
- Add-on media/history proxying can also run as a server-owned app request, keeping the harmless browser placeholder token out of those fetches.
- Completed fifth slice: browser-blind standalone Home Assistant WebSocket proxying.
- `/api/ha-websocket` upgrades are same-origin checked, load the real Home Assistant token from the HttpOnly server session, refresh expired OAuth access tokens before connecting upstream, and rewrite only the initial harmless browser auth frame.
- Completed sixth slice: rate limiting and upload privacy hardening.
- Server hook rate limits cover sensitive auth/session writes, uploads, heavy import/search endpoints, Home Assistant/Mealie/history proxies, and generic API mutations, with `DASHBOARD_RATE_LIMIT=false` available for trusted local development troubleshooting.
- Uploaded files now get opaque UUID-only names instead of retaining sanitized source filenames, and served uploads use private immutable cache headers plus `nosniff`.
- Completed seventh slice: server-owned standalone Home Assistant OAuth callback and best-effort token revocation.
- Standalone login now creates a short-lived HttpOnly OAuth state cookie, redirects the browser to Home Assistant, exchanges the returned code server-side, writes the session to `ha-sessions.json`, and redirects back to Settings without exposing access or refresh tokens to app JavaScript.
- Disconnect now posts the stored refresh token to Home Assistant `/auth/revoke` before clearing the local session; local session cleanup still succeeds if Home Assistant is unavailable.
- Completed eighth slice: external-integration SSRF posture.
- Browser-assisted recipe import now blocks localhost/private/reserved hosts at input, DNS verification, page navigation/subresource, redirect, and image-download boundaries.
- Rain proxy coordinate handling now validates numeric ranges and builds a fixed upstream URL with URLSearchParams instead of interpolating raw query input.
- Configured Mealie base URLs stay local-network friendly for household Docker installs, but reject unsupported schemes, malformed values, and embedded credentials.
- Completed ninth slice: release-time dependency audit.
- `npm audit --audit-level=moderate` surfaced only a low-severity transitive `cookie <0.7.0` advisory through SvelteKit; the app now uses an npm override to pin `cookie@0.7.2`, and `npm install --package-lock-only` reports zero vulnerabilities.
- Completed tenth slice: stricter standalone CSP defaults.
- Standalone production CSP now defaults to hardened same-origin connect/image rules; direct broad `http:`/`https:`/`ws:`/`wss:` allowances require explicit `DASHBOARD_CSP_MODE=compat`.
- Next security slice after this: real-flow validation of the hardened standalone default.

1. Live visual acceptance on a real generated dashboard:
   - Regenerate the kitchen and at least one other room with Clean Generated.
   - Review desktop, wall-tablet, phone portrait, and phone landscape.
   - Promote any concrete layout, text overflow, color contrast, or control-overlap issue into a regression test.
   - Automated proxy is now in place for generator invariants; this item remains open for real visual inspection with actual HA room data and photos.

2. Adaptive text readability:
   - Audit all image-backed cards, detail-sheet hero areas, generated room cards, and shortcut-heavy cards for dark-on-dark or light-on-light text.
   - Weather hero has moved to local image protection; keep applying the same pattern to future camera/media/detail heroes where full-surface overlays are not needed.
   - Image-backed navigation cards now expose the shared readable image-surface contract so visual checks can distinguish intentionally protected image labels from unprotected text over images.
   - Visual smoke now catches visible card content overflowing vertically, which helps keep compact/touch cards sized to their actual controls and labels.
   - Validate a freshly generated real dashboard with room-preview images and promote any remaining contrast issue into a focused regression.
   - Keep extending the screenshot-sampled Playwright checks when new image-backed cards or hero treatments are added.

3. Bubble-style detail sheets:
   - Baseline is complete: entity detail sheets are now global root-shell surfaces and reusable cards can open them outside `/dashboard`.
   - Existing specialist controls cover the daily-use domains currently represented by the card library.
   - Remaining work is regression-only: add more route-specific smoke cases when new non-dashboard card surfaces are introduced.

4. Tablet / kiosk mode:
   - Test on an actual wall tablet, not only simulated viewports.
   - Validate idle dimming, wake-tap suppression, edit-lock behavior, always-hidden navigation, optional wake lock, and the idle clock/weather/media overlay during long running sessions.
   - Enabled lock screen now starts unlocked after reload and activates only after the configured idle timeout, avoiding accidental navigation blocking during normal dashboard use.
   - README now has a manual wall-tablet acceptance checklist; remaining work is live device feedback and possible deeper per-device onboarding copy after that test.

5. Presence and household context:
   - Presence now includes household setup hints for person trackers, guest mode, and commute/ETA helpers, plus broader discovery for travel-time sensors.
   - Remaining work: confirm privacy-sensitive data stays local and is not over-shown on shared tablets, then tune copy or visibility from real household use.

6. Meals, shopping, and Albert Heijn:
   - Mealie-first shopping now supports serving scaling, image repair, shopping-list placement, and review-first AH export from deduplicated Mealie shopping rows.
   - AH review now preserves grouped source ingredient lines so deduplication does not hide what came from each recipe.
   - AH review now has per-row product-search failure states, empty-match guidance, free-text fallback copy, and non-orderable product blocking.
   - Remaining work: live AH acceptance with a real account, observe real export failure shapes, and write manual Dutch supermarket flow notes after that test.

7. Home Assistant add-on release validation:
   - Manually install the add-on from a Home Assistant repository and open it from the sidebar.
   - Confirm ingress, zero-config Home Assistant access, persistent `/data`, websocket/proxy behavior, and existing standalone Docker deployment.
   - Keep GHCR multi-arch publishing and production deploy workflows separate.
   - Automated guardrail now catches add-on manifest drift for version, changelog, ingress, `/data`, image, architecture, and repository metadata.
   - Automated guardrail now also covers the server-side Supervisor REST proxy token boundary, catch-all route forwarding, stripped browser-only headers, and query/body forwarding behavior.

8. Security hardening:
   - CSP is now deployment-aware: Home Assistant add-on and standalone production deployments default to hardened same-origin connect rules, production script policy no longer allows `unsafe-eval`, and broad standalone compatibility requires explicit `DASHBOARD_CSP_MODE=compat`.
   - Hook-level coverage now verifies the real production response headers, report-only CSP env configuration, and cross-origin API mutation blocking.
   - Recent priority: Home Assistant proxy/history endpoints are now hardened against URL-shaped paths, path-segment escape, invalid origins, and production error leakage.
   - Recent priority: Home Assistant add-on WebSocket proxying now has origin checks plus first-auth gating before forwarding browser commands upstream.
   - Recent priority: durable standalone Home Assistant OAuth tokens now live in a server-side session store instead of browser `localStorage`, with one-time legacy migration.
   - Recent priority: standalone image/media/history proxy requests now use the HttpOnly server session instead of browser-supplied HA bearer headers.
   - Recent priority: standalone Home Assistant WebSocket traffic now goes through a server-side proxy that rewrites only the initial harmless browser auth frame to the real server-side HA token.
   - Recent priority: server-wide API rate limits and upload privacy hardening now protect sensitive routes without changing normal household use.
   - Recent priority: standalone Home Assistant OAuth is now server-owned from start through callback exchange, and disconnect performs best-effort refresh-token revocation.
   - Recent priority: external recipe and weather proxy requests now have tighter outbound boundaries, including browser-request blocking for public recipe imports and numeric-only rain proxy coordinates.
   - Recent priority: dependency audit is clean after pinning the transitive `cookie` package to patched `0.7.2` with an npm override.
   - Recent priority: standalone production CSP now defaults to hardened same-origin rules while preserving an explicit compatibility mode for trusted local deployments.
   - Remaining work: validate the hardened standalone default with real direct Home Assistant, media, weather, image-provider, Mealie, and AH flows; keep compatibility mode documented for trusted local deployments that need it.

9. Library and generator discipline:
   - Current audit is clean for the new specialist and graph surfaces: card-library picker entries, editor/config support, schema support, renderer support, generator placement where useful, focused tests, and `/library` examples are present.
   - Automated guardrail now checks that every schema-supported dashboard card type is offered by the add-card library sheet.
   - Keep this as a release gate for future cards and generated-card patterns.

10. Keep Our Edge quality guardrails:
   - `/library` must remain the visual workshop for shared patterns and card families.
   - New cards need default, max-capability, compact/touch, long-text, and empty/unavailable examples.
   - New shared household preferences default to backend storage; browser storage must stay cache, migration, auth/session compatibility, disposable radio/search cache, or explicit per-device tablet state.
   - Generator decisions from the temporary kitchen feedback plan have been promoted into architecture and covered by focused tests; the note is archived under `planning/archive/`.
   - Radio Browser country browsing now has regression coverage for stale-cache-first rendering plus background refresh.
   - Remaining work: use the guardrails during the next real generated-dashboard and wall-tablet acceptance pass.

### Dashboard Maturity Roadmap

Source feedback: repo review, Home Assistant dashboard patterns, Mushroom, Bubble Card, ApexCharts Card, Dwains Dashboard, and Home Assistant 2026.2 Overview direction.

Goal: move from "capable dashboard builder" to a daily wall-tablet dashboard that feels intelligent, trustworthy, and complete.

#### Slice 1: Trust And Acceptance

Status: complete.

Work:

- Keep README and architecture claims aligned with actual implementation.
- Do not claim "Strict CSP" until `hooks.server.ts` no longer needs broad inline/eval/connect/image allowances.
- Document current CSP as compatibility-oriented and track hardening separately.
- Fix mojibake and stale docs.
- Replace "all components have tests" with accurate testing guidance.
- Add Playwright visual acceptance smoke checks for dashboard, attention, settings, music, and meals across tablet/desktop/mobile viewports.
- Keep visual checks focused on app shell visibility, no broken local responses, no horizontal page overflow, and screenshot artifacts for manual review.

Acceptance:

- `README.md` and `architecture.md` are readable ASCII and match the app's current behavior.
- `npm run check`, `npm test -- --run`, `npm run build`, and `npm run test:visual` remain green.
- Playwright visual smoke can be run locally and in CI.

#### Slice 2: For You / Attention Surface

Status: completed.

Build a first-class attention surface that answers "what needs my attention now?"

Inputs:

- Discovered/new/unassigned devices where registry data is available.
- Open doors/windows.
- Active motion.
- Low batteries.
- Unavailable entities.
- Pending updates.
- Active media.
- Lights still on.
- Mealie/shopping reminders where configured.

Implementation notes:

- Start as a route and default navigation item, then let generated home dashboards embed the same attention sections.
- First route implementation exists at `/attention` with shared entity classification logic.
- Generated house dashboards now place a compact Attention strip before room navigation.
- Use existing entity collection/query logic where possible.
- Group by urgency and room.
- Keep every item actionable: navigate, open detail sheet, or call a safe service.

Acceptance:

- Empty state is useful and calm.
- Items show room, entity name, state, and last changed where available.
- No one-card summary that hides which entities need attention.
- Works without Home Assistant registry metadata, then improves when registry data is present.

#### Slice 3: Presence And Household Context

Status: mostly implemented; polish and live acceptance remain open.

Work:

- Person cards.
- Who is home / away.
- Zone status.
- Guest mode.
- "Home is empty" state.
- ETA/commute hooks where entities already exist.
- First route implementation exists at `/presence` with person/device-tracker fallback, zone grouping, guest-mode detection, and commute/ETA sensor hooks.
- `/presence` is part of the default navigation and visual smoke route set.
- Presence now has a reusable dashboard card, is available from the card library, and is added to generated house dashboards when person/device-tracker entities exist.
- The route now shows setup hints when expected household signals are missing, including suggested `person.*`, guest-mode helper, and commute sensor examples.
- ETA/commute discovery now recognizes more Dutch, English, German, French, and Spanish travel-time naming patterns while avoiding diagnostic/noisy sensors.

Open:

- Validate shared-tablet privacy expectations with real household data.
- Tune the setup hint copy, suggested helper names, and ETA discovery with real Home Assistant entity names after live use.

Acceptance:

- Presence feels like a dashboard center, not only another entity list.
- Privacy-sensitive data stays local to Home Assistant/app runtime.

#### Slice 4: Bubble-Style Detail Sheets

Status: complete.

Work:

- Reusable entity detail sheet/pop-up system.
- Compact cards stay small; deep controls open on tap.
- Support sub-actions for common card types.
- Detail sheets should work well on wall tablets and phones.
- First reusable detail sheet exists on dashboard pages, backed by a shared entity detail store.
- Room summary and collection/attention cards can open the sheet outside edit mode.
- Button, media, and thermostat cards now expose the same compact detail affordance outside edit mode.
- Camera, remote, and device panel cards now expose the same detail affordance for their active/controlled entities.
- The sheet supports entity selection plus light, media, cover, climate, fan, humidifier, lock, alarm, vacuum, update, switch/input boolean, button, scene, and script controls.
- Card editor side sheets are now owned by the root app shell, which fixed library-page editor actions that previously appeared only after navigating back to the dashboard.
- Entity detail sheets are also owned by the root app shell, so reusable card affordances work from `/library`, `/attention`, `/presence`, and future feature routes.
- Added Playwright smoke coverage for opening and dismissing a detail sheet from the library route, proving the non-dashboard host path.
- The specialist card family now has live examples on `/library`, keeping the sheet and card patterns inspectable as a design system.

Acceptance:

- Light, media, room, security, cover, and climate cards can open richer controls without making the grid bulky.
- Sheet keyboard/touch dismissal and focus behavior are predictable.

#### Cross-Cutting: Adaptive Text Readability

Status: mostly implemented; live generated-dashboard acceptance remains open.

Problem:

- Theme-derived text colors can become unreadable on dark cards, generated room images, and image-backed surfaces when the background color is too similar.
- Full-surface overlays would solve contrast but make the dashboard look flat and bland.

Preferred approach:

- Fix incorrect text tokens first so core MD3 surfaces never fall back to raw black on dark backgrounds.
- Add reusable local text protection patterns, such as a subtle readable text layer or label strip behind text-heavy areas only.
- Use anchored edge gradients where text sits, not a blanket overlay across the whole card.
- Add adaptive contrast selection for image-backed cards: choose light text, dark text, or a protected layer based on the sampled text region.
- Use soft text shadows only as a supporting treatment on photo backgrounds.
- Add Playwright contrast sampling for important labels so unreadable text can be detected during visual acceptance.

Completed so far:

- Fixed the shared entity detail sheet so the hero/title region explicitly uses MD3 foreground tokens instead of inheriting raw browser black.
- Added reusable local image-readability CSS helpers: edge gradients, image text shadow, label stack protection, and readable chips.
- Updated image-backed navigation cards to use localized top/bottom readability treatment instead of a full-card scrim.
- Added a contrast utility for explicit hex/rgb custom card backgrounds and wired card surfaces to expose a readable foreground CSS variable.
- Added focused tests for contrast helpers, card-surface readable foreground styles, and image navigation readability affordances.
- Added Playwright visual smoke coverage for obvious key-label contrast regressions and missing image-text protection classes.
- Navigation-card shortcut/action overlap was fixed by moving the edit affordance into the same top action row as shortcuts.
- Added screenshot-sampled regional image-label contrast checks so protected labels are tested against rendered local pixels, not just DOM classes.
- Added a library navigation-card visual regression that exercises image-backed room links on a phone viewport and verifies shortcut/edit controls do not overlap.
- Added a visible text-bounds Playwright assertion that catches labels escaping their local button/card/sidebar containers while allowing intentional truncation.
- Fixed the Settings tab bar so longer translated tab labels shrink/truncate inside the tab pill on tablet portrait instead of overflowing.

Open:

- Audit remaining image/custom-background cards and future top-right action clusters as they are added.
- Validate the checks against a real freshly regenerated kitchen/room dashboard, not only library examples and current smoke routes.

Acceptance:

- Image-backed cards keep their visual character while labels remain readable.
- Detail sheets and generated room/navigation cards do not show dark-on-dark or light-on-light primary labels.
- Visual smoke or contrast checks catch regressions in key card/header text zones.

#### Slice 5: Specialist Cards

Status: completed.

Priority order:

1. Alarm/security.
2. Lock.
3. Cover/blinds.
4. Fan/humidifier.
5. Vacuum.
6. Person/presence.
7. Update.
8. To-do/shopping list.

Implementation notes:

- First dedicated Security card exists with alarm controls, lock/opening/motion/safety status rows, detail-sheet access, card library/editor support, schema support, and generator placement on the home security dashboard.
- Dedicated Lock card exists with auto-discovered/manual locks, lock-all control, optional unlock controls, detail-sheet access, card library/editor support, schema support, tests, and generator placement when lock entities exist.
- Dedicated Cover/blinds card exists with auto-discovered/manual cover entities, group open/stop/close controls, position display, detail-sheet access, card library/editor support, schema support, tests, and generator placement for room cover entities instead of the generic device panel.
- Dedicated Air card exists with auto-discovered/manual fan and humidifier entities, group on/off/boost controls, fan speed and humidifier humidity readouts, detail-sheet access, card library/editor support, schema support, tests, and generator placement for room fan/humidifier entities instead of the generic device panel.
- Dedicated Vacuum card exists with auto-discovered/manual robot vacuums, group start/pause/dock controls, battery and fan speed readouts, issue/offline states, detail-sheet access, card library/editor support, schema support, tests, and generator placement for room/entity-type vacuum entities instead of the generic device panel.
- Dedicated Presence surface exists with person/zone summaries, home-empty/guest-mode context, a route-level overview, card library/editor support, schema support, tests, and navigation discovery.
- Dedicated Update card exists with auto-discovered/manual update entities and update binary sensors, check-for-updates action, per-item install/clear-skipped controls, version/release details, detail-sheet access, card library/editor support, schema support, tests, and generator placement for maintenance/entity-type update entities.
- Dedicated To-do & Shopping card exists with auto-discovered/manual Home Assistant to-do lists, `todo.get_items` fetching, add-item and complete-item controls, due-date/list detail display, fallback list-count rows, detail-sheet access, card library/editor support, schema support, tests, and generator placement for house/entity-type to-do lists.
- Every new specialist card must be added to the card library, editor preview/config flow, schemas, generator placement, and focused tests in the same slice.

Acceptance:

- Specialist cards provide first-class daily controls, not just generic button wrappers.
- Each card has an empty/unavailable state and at least focused component or domain tests.

#### Slice 6: Graph Analytics

Status: completed.

Work:

- Thresholds.
- Today/yesterday comparison.
- Min/max bands.
- Multi-series presets.
- Energy/water/gas trends.
- History/statistics fallback behavior.
- Anomaly callouts.

Implementation notes:

- First graph analytics pass is implemented on the existing Graph/MiniChart path.
- Graph cards now support threshold lines, min/max range bands, previous-period comparison, analytics callouts, and automatic recorder statistics fallback for longer ranges.
- Graph cards now support normalized scale mode for mixed-unit trend cards, plus a compact multi-series legend.
- Expanded graph cards now show a compact metric strip with current value, average, min/max range, and previous-period delta when comparison data exists.
- Generated graph-worthy room/floor/entity sensor cards default to previous-period comparison, statistics/history auto mode, and sensible comfort overlays for temperature/humidity graphs.
- Generated house statistics add a normalized energy/gas/water utility trend card when multiple utility entities are discovered.
- The editor exposes graph data source, statistics period, scale mode, comparison, callout, threshold, and range-band controls.
- The card library includes a Utility Trends Graph preset so mixed-unit utility analytics can be added manually.
- Focused tests cover analytics helpers, chart overlays, graph card fallback/comparison/normalized behavior, schema persistence, editor persistence, library defaults, and generator defaults.

Acceptance:

- Graphs answer household questions instead of only plotting raw lines.

#### Slice 7: Tablet / Kiosk Mode

Status: functional baseline implemented; real-device acceptance remains open.

Work:

- Per-device navigation and density settings.
- Idle dimming.
- Screensaver/weather/media lock screen.
- Hide edit controls unless explicitly unlocked.
- Wake gestures.
- Burn-in safer clock/weather/media display.

Completed so far:

- Added backend-backed kiosk configuration to app config validation and storage.
- Added a kiosk store with idle dimming state, idle navigation hiding, and temporary edit unlocks.
- Added wake-gesture protection so the first tap on an idle wall tablet wakes the dashboard without activating the card underneath.
- Added an optional kiosk idle screensaver overlay with a burn-in-safer drifting clock, current weather, and active media context.
- Added local per-device kiosk profiles for wall tablets, including density and always-hide navigation preferences that do not sync to the shared backend config.
- Added an optional shared kiosk screen wake-lock setting that requests the browser Screen Wake Lock API when supported and reports unsupported/unavailable states in Settings.
- Root layout now consumes kiosk state through global shell data attributes instead of per-card hacks.
- Settings now exposes kiosk controls next to the lock screen settings, including the idle screensaver toggle, wake-lock status, and this-device tablet preferences.
- Global CSS hides `.touch-edit-control` affordances while kiosk edit lock is active, including coarse pointer devices.
- Added focused tests for kiosk idle behavior, wake gesture suppression, idle screensaver persistence, wake-lock request/release/unsupported states, edit unlock expiry, local cache, backend sync, local device profile persistence, and config schema validation.

Open:

- Validate behavior on a real wall tablet over a long idle session.
- Decide whether to add richer PWA/fullscreen onboarding inside Settings after live wall-tablet testing.

Acceptance:

- A wall tablet can be left running without accidental edits, accidental wake-tap actions, or visually noisy idle states.
- Idle kiosk mode has a calmer clock/weather/media state that avoids fixed-position burn-in.
- A kitchen tablet can hide navigation or use a larger touch density without changing the dashboard for phones, desktops, or other tablets.

### Generator Room Dashboard Polish

Source plan: [planning/archive/kitchen-generator-feedback-plan.md](planning/archive/kitchen-generator-feedback-plan.md)

Status: implementation complete; awaiting live visual acceptance on a freshly regenerated kitchen dashboard.

Improve generated room dashboards so they are less repetitive, less bulky, and less duplicate-prone.

Completed:

- Added generator entity ownership and deduplication before cards are created.
- Uses Home Assistant light groups instead of individual member lights when a real group exists.
- Keeps nested Home Assistant light groups visible; suppresses only individual member lights.
- Does not infer light groups from similar names; grouping belongs in Home Assistant.
- Suppresses duplicate remotes when the media card already controls the same media player.
- Keeps remotes only when they control a distinct, visible target.
- Keeps entity names as Home Assistant provides them; quality hints cover repetitive names.
- Hides unknown/unavailable sensors from normal primary/status/history sections.
- Skips unknown/unavailable entities from normal generated cards.
- Generates compact controls for secondary lights and switches.
- Preserves one large card for the primary room control only.
- Adds clean/regenerate buttons for the whole generated home set and the current room/page.
- Keeps clean/regenerate preview-first and explicit before applying, with a second confirmation for clean apply.
- Adds preview quality hints for grouped, skipped, name-review, and deduplicated entities.
- Extracts entity area-source and inventory quality review counts into a reusable domain helper so future generator, label, or repair tooling can share the same rules.
- Adds generator tests for light groups, media/remote deduplication, name cleanup, sensor filtering, and compact room output.
- Uses Home Assistant area pictures as optional room-card preview images on generated house/floor room navigation cards.
- Loads room-card preview images through the authenticated HA image helper so browser-visible URLs do not expose tokens.
- Adds non-blocking generation quality hints for populated rooms that do not yet have a Home Assistant area picture.
- Adds a deterministic room visual profile helper for room-kind icons and future image prompt seeds.
- Persists room visual profile metadata on generated navigation cards so future preview image generation can be audited and cached.
- Makes generated room navigation cards tile-shaped before adding image assets, reducing clipping and the stretched-row look.
- Caps dynamic icon glyph sizing inside scalable icon containers so room-card icons cannot overflow their circular affordances.
- Uses the taller square room-card ratio only when a generated navigation card has an actual image; icon-only fallback cards stay more compact.
- Adds deterministic local generated room preview images for room navigation cards when Home Assistant does not provide an area picture.
- Keeps Home Assistant area pictures as the preferred image source; generated previews are only a fallback.

Remaining acceptance:

- Regenerate the kitchen dashboard with Clean Generated.
- Review the actual page visually on desktop and mobile.
- Add or confirm Home Assistant area pictures for rooms where a real room photo should replace the generated preview.
- Add an optional stock-photo provider flow for high-quality room preview images when Home Assistant has no area picture.
- Promote any final visual tweaks into tests, then archive or remove the temporary planning note.

Accepted decisions:

- Light groups come from Home Assistant only.
- Unknown/unavailable cards are hidden from normal generated dashboards.
- Remotes are skipped when they control the same media player already represented by a media card.
- Names stay as configured in Home Assistant.
- Quality hints are enough for suppressed entities; users can add entities back with normal editing tools.

Resolved design decisions:

- Secondary controls use compact button cards.
- Default large-card budget is one primary control per room.
- Temperature, humidity, CO2, illuminance, and similar comfort readings use readable compact state cards; additional sensors use summaries or graphs where useful.
- Clean/regenerate replaces generated cards only, preserving manual and pinned content.
- Room navigation cards use a compact tile ratio on generated home/floor dashboards.
- Generated room previews are local deterministic SVG image assets served by the app; HA area pictures still override them, and AI-generated bitmap assets remain optional later polish.
- Real stock photos should be chosen through a controlled provider flow, stored with attribution/source metadata, and cached or persisted so dashboards do not depend on live third-party lookups during render.

## Later

- Expand the reusable inventory quality helper into optional bulk repair guidance if live generated-dashboard reviews show repeated Home Assistant area/label issues.
- Revisit runtime conditional visibility after generation-time attention cards settle.
- Evaluate stock-photo providers such as Pexels, Unsplash, Pixabay, and curated/self-hosted packs for room preview images.
- Add optional stock photo search/selection for room preview images, with server-side API keys where needed, attribution/source metadata, and deterministic cached selections.
- Add optional AI-generated bitmap room preview assets only if stock photos and local SVG previews are not rich enough.
