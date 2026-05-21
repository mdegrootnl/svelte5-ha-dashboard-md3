# Backlog

This backlog tracks near-term product and engineering work. Temporary implementation notes can live in `planning/` and should be promoted or removed once the work is complete.

## Current Focus

### Status Snapshot

Last documentation pass: May 21, 2026.

- Completed roadmap slices: Trust And Acceptance, For You / Attention Surface, Bubble-Style Detail Sheets, Specialist Cards, and Graph Analytics.
- In-progress roadmap slices: Presence And Household Context, Tablet / Kiosk Mode, Adaptive Text Readability, and live generated-dashboard acceptance.
- Latest local validation after the kiosk per-device profile pass: focused kiosk store tests, `npm run check`, `npm test -- --run`, `npm run build`, and `npm run test:visual` passed. Visual smoke covers dashboard, attention, presence, settings, music, and meals under a simulated Home Assistant ingress path across desktop, tablet, and phone viewports, including page overflow, key label contrast, and image-label protection checks.
- Known local visual-test noise: Supervisor DNS warnings are expected outside the Home Assistant add-on runtime and did not fail the smoke suite.
- Recent targeted fixes: card editor and entity detail side sheets are now hosted by the root app shell so reusable card actions work outside `/dashboard`; navigation-card edit controls now share the shortcut action row instead of overlapping top-right shortcuts; Home Assistant to-do cards no longer visibly churn from broad state polling; the library route now has live specialist-card examples; AH export review preserves grouped Mealie source lines before deduplicated export.

### Open Work Summary

This is the current short list of what is still genuinely open.

1. Live visual acceptance on a real generated dashboard:
   - Regenerate the kitchen and at least one other room with Clean Generated.
   - Review desktop, wall-tablet, phone portrait, and phone landscape.
   - Promote any concrete layout, text overflow, color contrast, or control-overlap issue into a regression test.

2. Adaptive text readability:
   - Audit all image-backed cards, detail-sheet hero areas, generated room cards, and shortcut-heavy cards for dark-on-dark or light-on-light text.
   - Add regional image/background contrast sampling for labels that sit on photos or generated room previews.
   - Extend Playwright checks beyond obvious labels so problematic text/background pairs are caught before release.

3. Bubble-style detail sheets:
   - Baseline is complete: entity detail sheets are now global root-shell surfaces and reusable cards can open them outside `/dashboard`.
   - Existing specialist controls cover the daily-use domains currently represented by the card library.
   - Remaining work is regression-only: add more route-specific smoke cases when new non-dashboard card surfaces are introduced.

4. Tablet / kiosk mode:
   - Test on an actual wall tablet, not only simulated viewports.
   - Validate idle dimming, wake-tap suppression, edit-lock behavior, always-hidden navigation, and the idle clock/weather/media overlay during long running sessions.
   - Consider PWA/fullscreen guidance, optional wake-lock behavior, and per-device onboarding copy.

5. Presence and household context:
   - Polish the presence route/card with richer household context, clearer guest-mode setup, and better ETA/commute entity discovery.
   - Confirm privacy-sensitive data stays local and is not over-shown on shared tablets.

6. Meals, shopping, and Albert Heijn:
   - Mealie-first shopping now supports serving scaling, image repair, shopping-list placement, and review-first AH export from deduplicated Mealie shopping rows.
   - AH review now preserves grouped source ingredient lines so deduplication does not hide what came from each recipe.
   - Remaining work: live AH acceptance with a real account, stronger per-row product-search/export failure states, and manual Dutch supermarket flow notes after that test.

7. Home Assistant add-on release validation:
   - Manually install the add-on from a Home Assistant repository and open it from the sidebar.
   - Confirm ingress, zero-config Home Assistant access, persistent `/data`, websocket/proxy behavior, and existing standalone Docker deployment.
   - Keep GHCR multi-arch publishing and production deploy workflows separate.

8. Security hardening:
   - Either tighten CSP toward a stricter production posture or keep documenting it as compatibility-oriented.
   - Revisit broad connect/image/script allowances after ingress, media, image providers, and integrations stabilize.

9. Library and generator discipline:
   - Current audit is clean for the new specialist and graph surfaces: card-library picker entries, editor/config support, schema support, renderer support, generator placement where useful, focused tests, and `/library` examples are present.
   - Keep this as a release gate for future cards and generated-card patterns.

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

Open:

- Improve guest-mode setup and copy so a household knows which Home Assistant helper to create.
- Improve ETA/commute discovery beyond simple entity hooks.
- Validate shared-tablet privacy expectations with real household data.

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

Status: in progress; local helpers and tests exist, but full visual acceptance remains open.

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

Open:

- Add regional contrast sampling for labels on images/generated previews instead of only checking obvious text tokens.
- Audit every card with image, custom background, or top-right action clusters.
- Add visual regression coverage for shortcut/edit-control overlap on navigation cards and other action-heavy cards.

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
- Root layout now consumes kiosk state through global shell data attributes instead of per-card hacks.
- Settings now exposes kiosk controls next to the lock screen settings, including the idle screensaver toggle and this-device tablet preferences.
- Global CSS hides `.touch-edit-control` affordances while kiosk edit lock is active, including coarse pointer devices.
- Added focused tests for kiosk idle behavior, wake gesture suppression, idle screensaver persistence, edit unlock expiry, local cache, backend sync, local device profile persistence, and config schema validation.

Open:

- Validate behavior on a real wall tablet over a long idle session.
- Decide whether to add PWA/fullscreen setup guidance and optional wake-lock support.
- Add manual acceptance notes for per-device tablet preferences.

Acceptance:

- A wall tablet can be left running without accidental edits, accidental wake-tap actions, or visually noisy idle states.
- Idle kiosk mode has a calmer clock/weather/media state that avoids fixed-position burn-in.
- A kitchen tablet can hide navigation or use a larger touch density without changing the dashboard for phones, desktops, or other tablets.

### Generator Room Dashboard Polish

Source plan: [planning/temp-kitchen-generator-feedback-plan.md](planning/temp-kitchen-generator-feedback-plan.md)

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

- Promote stable generator rules into `architecture.md`.
- Add label/entity quality tooling once the generator behavior is stable.
- Revisit runtime conditional visibility after generation-time attention cards settle.
- Evaluate stock-photo providers such as Pexels, Unsplash, Pixabay, and curated/self-hosted packs for room preview images.
- Add optional stock photo search/selection for room preview images, with server-side API keys where needed, attribution/source metadata, and deterministic cached selections.
- Add optional AI-generated bitmap room preview assets only if stock photos and local SVG previews are not rich enough.
