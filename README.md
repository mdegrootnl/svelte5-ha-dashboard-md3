# Home Assistant Dashboard

A Material Design 3 dashboard builder for Home Assistant, built with Svelte 5 and SvelteKit.

This project is not a Lovelace theme. It is a standalone dashboard app with editable layouts, generated room dashboards, Home Assistant add-on support, Music Assistant controls, weather, meals, shopping, attention/presence surfaces, and server-side configuration persistence.

## Features

### Home Assistant Integration

- Real-time entity sync through the Home Assistant WebSocket API
- Entity, area, device, floor, and label-aware dashboard generation
- Floor and room-based navigation
- History and recorder statistics support for graphs
- Standalone OAuth/long-lived-token deployment and Home Assistant add-on ingress deployment
- Home Assistant add-on zero-config access through server-side Supervisor REST/WebSocket proxying

### Dashboard Engine

- Preview-first dashboard generation
- Editable responsive grid layouts for desktop, tablet, and phone profiles
- Generated, user-modified, and pinned dashboard states
- Card library with picker entries and live examples for button, media, thermostat, title, tabs, graph, navigation, room, collection, energy, calendar, weather, remote, device panel, camera, presence, security, lock, cover, air, vacuum, update, and to-do cards
- Touch-focused editing and navigation controls, including optional kiosk mode with per-device density/navigation, idle dimming, wake-tap protection, and an idle clock/weather/media overlay for wall tablets
- Bubble-style entity detail sheets for richer controls without oversized cards
- Graph analytics with threshold lines, range bands, previous-period comparison, normalized multi-series trends, and compact metric summaries

### Integrations

- Music Assistant browsing, player control, favorites, and default player selection
- Backend-backed music favorites shared across devices
- Weather dashboard with forecast, rain radar, precipitation graph, and environmental widgets
- Mealie recipes, meal planning, shopping lists, and import helpers
- Optional Albert Heijn shopping export for Dutch households, using a review-first deduplicated Mealie shopping list

### Theming And UI

- Dynamic Material Design 3 color generation
- Dark mode, navigation style, card radius, and card surface settings
- Multilingual UI with Dutch as the primary dashboard language
- MD3 primitives for buttons, cards, text fields, switches, checkboxes, radios, chips, and FABs
- Lock screen and kiosk controls for shared idle behavior plus per-device wall-tablet preferences

### Security Posture

- Production security headers are set in `src/hooks.server.ts`
- API mutations are blocked for cross-origin requests
- Runtime settings, tokens, uploads, and integration secrets are kept outside git in `data/`
- API payloads are validated with Zod where practical
- CSP is present, but currently permissive for Home Assistant ingress, development constraints, media, images, and external integrations. CSP hardening is tracked in the backlog.

## Getting Started

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run check
npm test -- --run
npm run test:visual
npm run build
```

`npm run test:visual` runs the Playwright visual smoke suite against a simulated Home Assistant ingress base path across desktop, tablet landscape, tablet portrait, and phone viewports. It checks local route failures, page overflow, key label contrast, and image-label protection.

Docker:

```bash
docker compose up --build
```

## Project Structure

```text
src/
  lib/
    components/        Shared UI primitives and layout components
    features/          Dashboard, attention, presence, music, kiosk, lock screen, meals, calendar features
    domain/            Pure domain logic and schemas
    server/            Server-side config, proxy, and integration helpers
    stores/            Global Svelte 5 rune stores
    types/             Shared TypeScript types
    utils/             Browser and app utilities
  routes/
    dashboard/         Main floor and room dashboard routes
    attention/         For You / Attention surface
    presence/          Household presence surface
    music/             Music Assistant experience
    meals/             Mealie and shopping experience
    settings/          Connections and app settings
    theme/             Theme builder
    weather/           Weather dashboard
```

## Configuration

1. Open Settings.
2. Connect Home Assistant using OAuth, a long-lived token, or the Home Assistant add-on zero-config path.
3. Configure optional integrations such as Mealie, image providers, and Albert Heijn.
4. Tune navigation, lock screen, optional kiosk settings, and per-device tablet preferences.
5. Generate or edit dashboards from the dashboard route.

## Deployment And Persistence

Configuration is stored server-side in `data/config.json`. Browser `localStorage` is used only as a fast cache for startup, optimistic UI, and explicitly local per-device tablet preferences.

In Docker, mount a persistent data volume:

```bash
-v $(pwd)/data:/app/data
```

You can also set:

```bash
DASHBOARD_DATA_DIR=/srv/ha-dashboard/data
```

### Home Assistant Add-On

This repository can be added to the Home Assistant add-on store:

```text
https://github.com/mdegrootnl/svelte5-ha-dashboard-md3
```

The add-on lives in `ha-dashboard/`, opens through Home Assistant ingress, persists data in `/data`, and uses server-side Supervisor API access for zero-config Home Assistant connectivity. Standalone Docker deployment remains supported.

For a local ingress-style preview, run:

```bash
npm run preview:addon
```

## Current Status

The maturity roadmap in `BACKLOG.md` is the source of truth. As of the latest docs pass, Trust/Acceptance, Attention, Bubble-style Detail Sheets, Specialist Cards, and Graph Analytics are complete; Presence, Tablet/Kiosk Mode, Adaptive Text Readability, and live generated-dashboard acceptance are in progress.

## Documentation

- [Architecture Overview](./architecture.md)
- [Security Risks](./securityrisks.md)
- [Backlog](./BACKLOG.md)

## License

MIT
