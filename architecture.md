# Architecture Overview

Last updated: May 24, 2026

This app is a standalone SvelteKit dashboard builder for Home Assistant. The architecture favors backend-backed household state, feature-owned routes, Svelte 5 rune stores, preview-first dashboard generation, and a root-owned app shell for wall-tablet behavior.

## Runtime Model

- The root layout owns the global shell: navigation, theme initialization, lock screen, kiosk state, Home Assistant initialization, app base path, and config event subscription.
- Feature routes own feature UI. New functionality should use `PageShell` and avoid adding feature-specific behavior to the root shell.
- `data/config.json` is the canonical shared dashboard configuration.
- Browser `localStorage` is a fast cache and optimistic UI helper, not the source of truth.
- `/api/events` streams config-change events so other devices can refresh theme, dashboards, lock screen, kiosk, and music library state.

## Project Structure

```text
src/
  app.css
  hooks.server.ts
  lib/
    components/
      common/        DynamicIcon, IconPicker, shared utilities
      layout/        PageShell, dashboard grid UI, editors, sheets
      md3/           Material Design 3 primitives
      settings/      Settings-specific components
      viz/           Data visualization helpers
      weather/       Weather display components
    domain/          Pure generation, schema, action, and transform logic
    features/
      attention/      For You / Attention classification and route logic
      dashboard/     Cards, dashboard stores, grid utilities
      kiosk/         Kiosk mode store and idle/edit-lock behavior
      music/         Music Assistant components and stores
      meals/         Recipe, planning, and shopping helpers
      presence/      Household presence and zone helpers
      lockscreen/    Lock screen components and store
      calendar/      Calendar aggregation
    server/          Storage, deployment, proxy, and integration modules
    stores/          Global Home Assistant, registry, theme, and weather stores
    types/           Shared types
    utils/           Browser and app utilities
  routes/
    api/             App, integration, proxy, and config endpoints
    attention/       For You / Attention route
    calendar/        Calendar agenda route
    dashboard/       Main dashboard route
    library/         Card library route
    meals/           Meals and shopping route
    music/           Music route
    presence/        Household presence route
    settings/        Settings route
    theme/           Theme route
    weather/         Weather route
```

## State And Persistence

### Server Config

`JsonStorageService` loads and saves `data/config.json`. Partial settings writes and dedicated music-library writes use a shared write lock to prevent read-modify-write races.

Shared app state currently includes:

- `theme`: color, dark mode, language, navigation, card surface settings
- `dashboards`: saved room/floor/home dashboard configs
- `pages`: custom pages
- `musicLibrary`: favorites, default player, sync timestamp
- `lockScreen`: idle lock and background settings
- `kiosk`: opt-in wall-tablet behavior, idle dimming, navigation hiding, and edit-control locking

### Client Stores

- `ThemeStore` applies MD3 tokens and user language.
- `DashboardStore` manages saved dashboard configs, active dashboard config, pages, and editor persistence.
- `MusicLibraryStore` uses backend music-library endpoints for favorites/default player and keeps local cache only for startup.
- `LockScreenStore` manages idle timeout and lock state.
- `KioskStore` manages opt-in idle dimming, idle navigation hiding, and temporary edit unlocks.
- `HAStore` owns Home Assistant auth, websocket connection, entity snapshots, service calls, history, and statistics.
- `HARegistryStore` owns areas, floors, entities, devices, and labels.

Server refresh methods must distinguish "apply server config" from user mutations so remote updates do not schedule write-back loops.

## Dashboard Generation

Generation is preview-first. The generator reads Home Assistant state, entity registry, device registry, areas, floors, and optional labels, then creates normal editable dashboard configs. It never persists or calls Home Assistant services until the user explicitly applies the preview.

Core rules:

- Home and floor dashboards stay light: attention summaries, room navigation, weather, energy, calendar, media, and maintenance context.
- Room dashboards use a stable order: attention, primary controls, comfort/climate, media/remote, openings/security/status, sensors/history, and actions.
- Home Assistant areas are the source of truth for rooms.
- Real Home Assistant light groups are preferred over individual member lights.
- Entity names stay as configured in Home Assistant; naming issues are surfaced as quality hints.
- Unknown and unavailable entities are excluded from normal generated content and surfaced through quality hints or attention views.
- Clean regeneration replaces generated content while preserving manual and pinned content.
- Inventory quality rules live in pure domain helpers where possible. The generation sheet uses the shared area-source summary helper for entity-registry, device-registry, name-inferred, and unassigned counts, keeping future quality/repair tooling aligned with generator review behavior.

## Card Library

Dashboard cards live in `src/lib/features/dashboard/components/cards/`. Current card families include:

- Button, media, thermostat, title, tabs, graph, navigation
- Room summary and entity collection
- Energy, calendar, weather, remote, device panel, camera
- Presence, security, lock, cover/blinds, air/fan/humidifier, vacuum, update, and to-do/shopping

New card families must be represented in the card-library picker, `/library` live examples, editor/config flow, renderer, schemas, generation rules where applicable, and focused tests. This keeps the dashboard builder discoverable as functionality grows.

## Global Shell And Kiosk Mode

The root layout is the only owner of global shell behavior. It initializes shared config, subscribes to `/api/events`, owns navigation wrappers, owns reusable card editor and entity detail sheets, and applies kiosk state through shell data attributes:

- `data-kiosk-dimmed`
- `data-kiosk-nav-hidden`
- `data-kiosk-edit-locked`

CSS then dims the main surface, hides navigation while idle, and suppresses `.touch-edit-control` affordances when kiosk editing is locked. Feature cards do not need bespoke kiosk logic unless they introduce a new global affordance.

Kiosk settings are split intentionally: shared household config controls idle behavior, screensaver, edit locking, and optional Screen Wake Lock usage; per-device local config controls touch density and whether navigation stays hidden on that tablet/browser. Wake lock is best-effort and browser-only, with unsupported devices reported in Settings instead of blocking kiosk mode.

Reference projects such as Mushroom, Bubble Card, ApexCharts Card, Auto Entities, and Dwains Dashboard are product-pattern references only. We keep the implementation in the SvelteKit/TypeScript stack.

## Integrations

### Home Assistant

Standalone mode uses OAuth or long-lived tokens. Add-on mode uses Home Assistant ingress and server-side Supervisor API access so the browser never receives the Supervisor token.

### Music Assistant

Music Assistant is reached through Home Assistant. Music favorites and default player are app-level household settings stored server-side so they sync across devices.

The radio tab uses Home Assistant Radio Browser media sources first (`media-source://radio_browser/country/<CODE>`) for country-aware station browsing. Country lists are cached for a week, can return large catalogs, support local name filtering, and deduplicate by stable station identity before falling back to Music Assistant search where Radio Browser is unavailable.

### Meals

Mealie remains the canonical recipe, meal-planning, and shopping-list backend. The dashboard adds Dutch-friendly import helpers, recipe image repair, servings scaling, meal planning, and optional Albert Heijn export.

### Albert Heijn

Albert Heijn support is optional and Dutch-context only. Tokens are stored in ignored server-side runtime files and are never exposed to the browser. Export is review-first: users review matched products/free-text rows before writing to AH. The AH review starts from the Mealie shopping list, deduplicates rows by normalized ingredient key, and preserves grouped source lines so duplicate ingredients do not hide recipe context.

## Security

Implemented:

- Cross-origin API mutations are blocked in `hooks.server.ts`.
- Security headers are set in production.
- Home Assistant add-on framing is limited to same-origin ingress; standalone framing is denied.
- Runtime secrets are ignored under `data/`.
- API payloads use Zod validation where practical.
- Production CSP is built by `src/lib/server/securityHeaders.ts`: add-on deployments default to hardened same-origin connect rules, standalone defaults to compatibility mode, and production script policy does not allow `unsafe-eval`.

Known gap:

- CSP still allows inline script/style behavior for SvelteKit and MD3 runtime styling. Standalone compatibility mode also keeps broad connect/image source allowances unless `DASHBOARD_CSP_MODE=hardened` and explicit integration origins are configured. The backlog tracks further tightening after direct Home Assistant, media, image-provider, and add-on flows are fully validated.

## Testing

The project uses Vitest, Testing Library, and Playwright.

Run:

```bash
npm run check
npm test -- --run
npm run build
npm run test:visual
npm run test:e2e
```

Coverage is broad but not one-to-one for every card. Current expectations:

- Pure domain logic gets unit tests.
- Server integration modules get route or module tests.
- Shared stores get unit tests for persistence and sync behavior.
- Risky UI flows get component or Playwright coverage.
- Visual acceptance smoke runs through Playwright against the simulated Home Assistant ingress path across dashboard, attention, presence, settings, music, and meals on desktop, tablet, and phone viewports. It checks page overflow, visible text escaping local containers, contrast, and image-label protection.

## Adding New Card Types

Adding a card type generally requires:

1. Update dashboard types and schemas.
2. Update editor creation/configuration mapping.
3. Add the renderer branch.
4. Add card configuration UI.
5. Add focused tests for domain logic, rendering behavior, and any service calls.

## Product Direction

Near-term product work is tracked in `BACKLOG.md`. The main direction is:

- For You / Attention surface
- Presence and household context
- Bubble-style detail sheets
- Dedicated specialist cards
- Better graph analytics
- Tablet/kiosk mode
- Adaptive text readability for image-backed and dark surfaces
