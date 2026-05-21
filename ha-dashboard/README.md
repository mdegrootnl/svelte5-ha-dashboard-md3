# MD3 Dashboard

A Material Design 3 dashboard for Home Assistant, packaged as a Home Assistant add-on.

The add-on opens in the Home Assistant sidebar through Ingress, stores dashboard data in `/data`, and connects to Home Assistant through the Supervisor API when available.

## Current Capabilities

- Ingress-first sidebar experience with optional direct port disabled by default.
- Persistent dashboard, theme, lock screen, kiosk, and music-library configuration in `/data`.
- Zero-config Home Assistant access through server-side Supervisor REST/WebSocket proxying.
- Same dashboard feature set as the standalone app: generated dashboards, Attention, Presence, Music Assistant, weather, meals, shopping helpers, specialist cards, graph analytics, and kiosk controls.

## Local Preview

From the repository root:

```bash
npm run preview:addon
```

This starts the app in an ingress-like mode for local testing.
