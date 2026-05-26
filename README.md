# Home Assistant MD3 Dashboard

A standalone Material Design 3 dashboard builder for Home Assistant, built with Svelte 5 and SvelteKit.

This project is not a Lovelace theme. It is a full dashboard application with its own app shell, generated and editable layouts, Home Assistant add-on support, shared backend configuration, touch/tablet ergonomics, Music Assistant controls, Radio Browser country radio, weather, meals, shopping, presence, attention/maintenance surfaces, and a growing smart-card library.

## What It Does

The app is designed for a household dashboard that works on wall tablets, phones, and desktops:

- Connects to Home Assistant in real time through the WebSocket API.
- Generates dashboard pages from Home Assistant floors, areas, devices, entities, labels, history, and registry data.
- Lets users edit generated layouts while preserving manual and pinned content across regeneration.
- Provides daily-use feature routes for dashboard navigation, attention items, presence, weather, music, meals, card library, theme, calendar, and settings.
- Stores shared household configuration on the backend so dashboard layout, music favorites, theme, lock screen, kiosk settings, and navigation sync across devices.
- Supports standalone Docker/self-hosted deployment and Home Assistant add-on ingress deployment.

## Main Routes

| Route | Purpose |
| --- | --- |
| `/` | Initial landing route; redirects into the dashboard experience. |
| `/dashboard` | Main home/floor/room dashboard, generator, editor, and live card grid. |
| `/dashboard/[floor]` | Floor dashboard generated from Home Assistant floor/area data. |
| `/dashboard/[floor]/[room]` | Room dashboard with room-specific controls, sensors, media, security, and history. |
| `/attention` | "For You" surface for open doors/windows, motion, low batteries, unavailable entities, active media, lights on, updates, and other maintenance items. |
| `/presence` | Household presence, people, zones, guest mode hints, and commute/ETA sensor context. |
| `/music` | Music Assistant browsing, search, playback, favorites, radio, and default player controls. |
| `/meals` | Mealie recipes, imports, meal planning, serving scaling, shopping lists, and optional Albert Heijn export. |
| `/weather` | Weather dashboard with forecasts, rain radar, rain graph, and environmental widgets. |
| `/calendar` | Calendar agenda view through Home Assistant calendar services. |
| `/library` | Live card/component library with examples for dashboard cards and editor flows. |
| `/theme` | Material Design 3 theme playground and visual token preview. |
| `/settings` | Home Assistant connection, integrations, navigation, dashboard, lock screen, kiosk, image providers, Mealie, AH, and app settings. |

Navigation is editable in Settings. Known routes are normalized so common routes get stable icons and labels even after older or customized navigation config is loaded.

## Dashboard Builder

### Generation

The generator reads Home Assistant data and builds editable dashboard configs. It is preview-first: a generated dashboard is shown as a preview and is only saved when the user explicitly applies it.

Generation understands:

- Home Assistant floors and areas.
- Entity registry, device registry, labels, and areas.
- Room and floor navigation.
- Area pictures and local generated room preview images.
- Entity availability and unknown/unavailable filtering.
- Real Home Assistant light groups.
- Room, security, presence, weather, calendar, energy, utility, sensor, media, and maintenance patterns.
- Quality hints for skipped, deduplicated, unassigned, missing-area-picture, and name-review items.

Clean regeneration replaces generated cards while preserving manual and pinned cards.

### Editing

The dashboard editor supports:

- Desktop, tablet, and phone layout profiles.
- Grid editing and responsive placement.
- Card add/edit side sheets.
- Per-card configuration.
- Generated/manual/pinned state tracking.
- Touch-friendly edit controls.
- Detail sheets for compact cards.
- Reusable card library entries and examples.

The root app shell owns global editor/detail sheets so reusable card actions work on dashboard pages, the library route, attention, presence, and future feature routes.

## Card Library

The current card families include:

- Button and state/action cards.
- Media card and compact media controls.
- Thermostat and climate controls.
- Title and section cards.
- Tabs.
- Graph and utility trend graph cards.
- Navigation and room cards.
- Entity collections.
- Energy flow and utility analytics.
- Calendar and weather cards.
- Remote and device panel cards.
- Camera cards.
- Presence cards.
- Security/alarm cards.
- Lock cards.
- Cover/blinds cards.
- Fan/humidifier/air cards.
- Vacuum cards.
- Update cards.
- To-do and shopping cards.

New cards should be added to the renderer, schemas, editor/config flow, generator where useful, focused tests, and `/library` examples. This keeps the app discoverable and prevents hidden one-off functionality.

## Home Assistant Integration

The app uses Home Assistant as the source of live home state.

Supported behavior:

- Server-owned OAuth or long-lived-token standalone connection.
- Home Assistant add-on zero-config connection through Supervisor API proxying.
- Real-time entity sync.
- Area, floor, entity, and device registry loading.
- Service calls for cards and detail sheets.
- Calendar service calls.
- History REST proxy.
- Recorder statistics WebSocket calls with history fallback.
- HA media source playback for Radio Browser stations.

The browser never receives the Home Assistant Supervisor token in add-on mode. In standalone OAuth mode, the app also keeps Home Assistant access and refresh tokens server-side behind an HttpOnly session cookie.

## Music And Radio

The music route is built around Music Assistant and Home Assistant media players.

Features:

- Player discovery and default player selection.
- Now-playing bar and full player.
- Play, pause, next, previous, volume, mute, shuffle, repeat, and seek controls.
- Music search ordered for browsing: playlists, artists, albums, podcasts, tracks, then radio.
- Library and favorites views.
- Backend-backed household music favorites and default player sync across devices.
- Local storage used only as a fast startup cache and one-time migration source.
- Radio tab with favorite stations and country browsing.

Country radio browsing prefers Home Assistant Radio Browser metadata through `media-source://radio_browser/country/<CODE>`. This gives reliable country-based station lists and avoids fuzzy Music Assistant search results. If Radio Browser is unavailable, the app falls back to Music Assistant search with curated filters.

The country station list is cached for a week, can fetch up to 1000 stations per country, and includes a name filter for quick navigation.

## Meals, Mealie, Shopping, And Albert Heijn

Mealie is the canonical recipe, meal-planning, and shopping backend.

The meals route supports:

- Connecting to Mealie from Settings.
- Recipe search and detail views.
- Browser URL recipe import helpers.
- Recipe image repair/import helpers.
- Serving count detection and scaling.
- Meal scheduling by day/time.
- Adding recipes or scaled ingredients to shopping flows.
- Mealie shopping-list workflows.
- Optional Albert Heijn export for Dutch households.

Albert Heijn support is optional and Dutch-context only. AH tokens are stored server-side under the app data directory and are never exposed to the browser. The AH flow starts from reviewed/deduplicated shopping rows, shows product/free-text choices, and exports to the main AH shopping list.

## Attention And Presence

### Attention

The attention surface answers "what needs attention now?"

It groups and surfaces:

- Open doors/windows.
- Active motion.
- Low batteries.
- Unavailable entities.
- Pending updates.
- Active media.
- Lights still on.
- Security/safety status.
- Shopping and maintenance signals where configured.

The route and generated dashboard cards avoid summary-only cards that hide which entities need action.

### Presence

The presence route provides household context:

- Person and device-tracker summaries.
- Home/away and zone grouping.
- Guest mode helper detection.
- "Home is empty" state.
- Commute/ETA sensor discovery.
- Setup hints for missing Home Assistant person, guest, or travel-time helpers.

Presence data stays local to Home Assistant and this app runtime.

## Weather And Calendar

Weather features include:

- Forecast overview.
- Forecast strips and lists.
- Rain radar.
- Rain graph.
- Weather icons for light/dark themes.
- Environmental widgets.

Calendar features include:

- Home Assistant calendar event fetching.
- Agenda-style event list.
- Dashboard calendar cards.

## Theme, Lock Screen, And Kiosk Mode

The app uses Material Design 3 color generation and component primitives.

Configurable UI behavior:

- Dark mode.
- Source color and generated MD3 tokens.
- Navigation style.
- Card radius and surface treatment.
- Language.
- Lock screen and idle behavior.
- Kiosk mode.

Kiosk mode is intended for wall tablets:

- Shared household kiosk settings are stored backend-side.
- Per-device tablet preferences stay local to that browser.
- Idle dimming.
- Optional idle clock/weather/media screensaver.
- Optional Screen Wake Lock support when the browser allows it.
- Wake-tap protection so the first tap wakes the dashboard instead of activating a card.
- Edit controls can be hidden while kiosk edit lock is active.
- Navigation can be hidden while idle or always hidden on a specific tablet.

## Languages

The UI supports:

- Dutch (`nl`) as the primary dashboard language.
- English (`en`).
- German (`de`).
- French (`fr`).
- Spanish (`es`).

Translations cover the app shell, dashboard/editor surfaces, settings, lock/kiosk areas, music, meals, weather, attention, presence, specialist cards, and common controls. New features should add translations for all supported languages in the same change.

## Persistence Model

`data/config.json` is the canonical shared household configuration.

Shared backend-backed state includes:

- Theme, dark mode, language, navigation, card surface settings.
- Dashboards and pages.
- Music library favorites, default player, and sync timestamp.
- Lock screen.
- Kiosk shared settings.

Additional server-side runtime files under `data/` store integration settings and tokens such as Mealie, image-provider settings, Albert Heijn tokens, uploads, and generated assets. These files are intentionally ignored by git.

Browser `localStorage` is used only for:

- Fast startup cache.
- Optimistic UI cache.
- One-time migration of old local music favorites when server favorites are empty.
- Explicitly local per-device kiosk/tablet preferences.

Remote config updates are streamed through `/api/events`, and clients refresh `/api/settings` without write-back loops.

## Deployment

### Local Development

Requirements:

- Node.js 24 or newer.
- A Home Assistant instance for real integration testing.

Install and run:

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run check
npm test -- --run
npm run build
npm run test:visual
npm run test:e2e
```

`npm run test:visual` runs Playwright visual smoke checks against a simulated Home Assistant ingress base path across desktop, tablet landscape, tablet portrait, and phone viewports. It covers dashboard, library, attention, presence, settings, music, meals, weather, and calendar. It checks local route failures, page overflow, visible text escaping local containers, key label contrast, screenshot-sampled image-label contrast, image-label protection, and key navigation/action overlap.

### Docker / Standalone

Build and run with Docker Compose:

```bash
docker compose up --build
```

Mount persistent data:

```bash
-v $(pwd)/data:/app/data
```

Or set an explicit data directory:

```bash
DASHBOARD_DATA_DIR=/srv/ha-dashboard/data
```

Standalone Docker now performs Home Assistant OAuth, REST, media, history, and WebSocket access from the app server. The Home Assistant URL you type in Settings is the browser-facing URL used to open the OAuth login page. If the app server needs a different address, configure a server-facing URL in `.env`:

```bash
DASHBOARD_HA_INTERNAL_URL=http://192.168.0.157:8123
```

This is the recommended Docker setup when `homeassistant.local` works in your browser but not inside the container. The login page still opens at the URL you entered, while token exchange, REST, media, history, and WebSocket proxying use `DASHBOARD_HA_INTERNAL_URL`.

As a lower-level fallback, you can also add a Docker host mapping:

```bash
DASHBOARD_EXTRA_HOST=homeassistant.local:192.168.0.157
```

Standalone mode starts Home Assistant OAuth from the browser, but the callback code is exchanged by the app server. Home Assistant tokens are stored in the server-side app data directory behind an HttpOnly session cookie.

### Home Assistant Add-On

This repository can be added to the Home Assistant add-on store:

```text
https://github.com/mdegrootnl/svelte5-ha-dashboard-md3
```

The add-on lives in `ha-dashboard/` and provides:

- Home Assistant sidebar ingress.
- Persistent `/data`.
- Zero-config Home Assistant access through server-side Supervisor REST/WebSocket proxying.
- Same app feature set as standalone mode.
- No browser exposure of `SUPERVISOR_TOKEN`.

Local ingress-style preview:

```bash
npm run preview:addon
```

See [ha-dashboard/DOCS.md](./ha-dashboard/DOCS.md) for add-on-specific installation and troubleshooting notes.

## Configuration

First-run setup:

1. Open Settings.
2. Connect Home Assistant, unless running as an add-on with zero-config available.
3. Configure optional integrations:
   - Music Assistant through Home Assistant.
   - Mealie.
   - Albert Heijn.
   - Image providers.
   - Weather entities and Home Assistant calendar entities.
4. Choose language, dark mode, navigation style, and theme source color.
5. Tune navigation items.
6. Configure lock screen and optional kiosk behavior.
7. Generate dashboards or add cards manually from the dashboard/card library.

## Security Posture

Implemented:

- Production security headers in `src/hooks.server.ts`.
- Deployment-aware CSP generation in `src/lib/server/securityHeaders.ts`.
- Cross-origin API mutations are blocked.
- Runtime secrets and integration tokens are stored outside git under `data/`.
- Add-on Supervisor token is kept server-side.
- Standalone Home Assistant tokens are durably stored server-side behind an HttpOnly session cookie, with legacy browser token storage migrated and removed.
- Standalone OAuth callback exchange is server-owned, so normal login no longer exposes Home Assistant access or refresh tokens to app JavaScript.
- Standalone image/media/history proxy requests use the server session instead of browser-supplied HA bearer headers.
- Standalone Home Assistant WebSocket traffic uses a server-side `/api/ha-websocket` proxy with a harmless browser token; the real HA token is loaded/refreshed server-side.
- Standalone disconnect performs best-effort Home Assistant refresh-token revocation before clearing the local session.
- Sensitive API paths have in-memory per-client rate limits, with `Retry-After` responses when exceeded.
- Browser-assisted recipe import verifies public recipe/image hosts and blocks Chromium requests to localhost, private, or reserved networks.
- Fixed external proxies such as Buienradar use structured input validation and fixed upstream origins.
- Uploaded images are stored under opaque filenames and served with private cache and `nosniff` headers.
- Dependency audit currently reports zero vulnerabilities; the SvelteKit transitive `cookie` dependency is pinned to patched `0.7.2` through an npm override.
- Standalone framing is denied.
- Add-on framing is limited to Home Assistant ingress.
- API payloads use Zod validation where practical.

CSP is intentionally deployment-aware:

- Home Assistant add-on and standalone production mode default to a narrower same-origin policy.
- Production script policy does not allow `unsafe-eval`.
- Most Home Assistant, Mealie, AH, weather, upload, and image-provider traffic is routed through same-origin app endpoints.
- Standalone compatibility mode remains available for unusual local HTTP image/network setups.

Optional CSP controls:

```bash
DASHBOARD_CSP_CONNECT_SRC="https://ha.example.local wss://ha.example.local"
DASHBOARD_CSP_IMG_SRC="http://camera.example.local"
DASHBOARD_CSP_REPORT_ONLY=true
```

Use `DASHBOARD_CSP_MODE=compat` only when a trusted local deployment still depends on broad direct browser access to local HTTP/WS origins.

See [securityrisks.md](./securityrisks.md) for current risks, mitigations, and hardening work.

## Project Structure

```text
src/
  app.css
  hooks.server.ts
  lib/
    components/        Shared UI, MD3 primitives, layout, settings, weather, viz
    domain/            Pure generation, schema, contrast, analytics, and action logic
    features/          Dashboard, attention, presence, music, meals, kiosk, lock screen, calendar
    server/            Storage, deployment, proxy, image, Mealie, AH, and integration helpers
    stores/            Global Home Assistant, registry, theme, weather, and shared stores
    types/             Shared TypeScript types
    utils/             Browser, app-base, icon, gesture, and helper utilities
  routes/
    api/               App settings, events, proxies, integration endpoints
    attention/         For You / Attention
    calendar/          Calendar agenda
    dashboard/         Main dashboard route
    library/           Card library and examples
    meals/             Mealie, meal planning, shopping
    music/             Music Assistant and radio
    presence/          Household presence
    settings/          Connections and app settings
    theme/             Theme builder
    weather/           Weather dashboard
ha-dashboard/          Home Assistant add-on metadata, docs, and image config
```

## Contributor Notes

Architectural expectations:

- Keep `+layout.svelte` as the only global shell owner.
- Put new feature UI in feature routes/components and wrap route content with `PageShell`.
- Keep shared household state backend-backed by default.
- Use local storage only for cache, migration, or explicitly per-device preferences.
- Add new smart cards to the card library, route examples, schemas, renderer, editor/config flow, and tests.
- Use [Adding A Feature Or Card](./docs/ADDING_FEATURE_OR_CARD.md) as the release gate for new feature and card work.
- Prefer Home Assistant registry/metadata over name guessing when reliable metadata exists.
- Keep touch controls large enough for wall tablets.
- Avoid adding full-card overlays when local text readability protection is enough.

Testing expectations:

- Pure domain logic gets unit tests.
- Server integration modules get route/module tests.
- Shared stores get persistence and sync tests.
- New card families get focused rendering/service-call tests.
- Risky visual/layout changes get Playwright coverage or a documented manual acceptance note.

## Current Status

The maturity roadmap in [BACKLOG.md](./BACKLOG.md) is the source of truth.

Completed major slices include:

- Trust and acceptance baseline.
- For You / Attention surface.
- Bubble-style detail sheets.
- Specialist card family.
- Graph analytics.
- Backend-first music favorites.
- Home Assistant add-on foundation and ingress support.
- Mealie and optional Albert Heijn shopping export baseline.

Still active:

- Real wall-tablet kiosk acceptance.
- Live visual acceptance on freshly generated dashboards.
- Further adaptive text readability audits.
- Live add-on release validation.
- Hardened standalone CSP validation.
- Real-account AH acceptance and polish.

## Documentation

- [Architecture Overview](./architecture.md)
- [Adding A Feature Or Card](./docs/ADDING_FEATURE_OR_CARD.md)
- [Security Risks](./securityrisks.md)
- [Backlog](./BACKLOG.md)
- [Home Assistant Add-On Docs](./ha-dashboard/DOCS.md)

## License

MIT
