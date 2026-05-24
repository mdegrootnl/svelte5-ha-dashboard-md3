# MD3 Dashboard Add-On

This folder packages the main SvelteKit application as a Home Assistant add-on. The full application guide lives in the repository root [README](../README.md); this file covers the add-on-specific behavior.

The add-on opens in the Home Assistant sidebar through Ingress, stores dashboard data in `/data`, and connects to Home Assistant through the Supervisor API when available.

## Current Capabilities

- Ingress-first sidebar experience with optional direct port disabled by default.
- Persistent dashboard, theme, lock screen, kiosk, and music-library configuration in `/data`.
- Zero-config Home Assistant access through server-side Supervisor REST/WebSocket proxying.
- Same dashboard feature set as the standalone app: generated dashboards, Attention, Presence, Music Assistant, weather, meals, shopping helpers, specialist cards, graph analytics, and kiosk controls.
- Runtime secrets such as Supervisor access stay server-side and are not exposed to the browser.

## Local Preview

From the repository root:

```bash
npm run preview:addon
```

This starts the app in an ingress-like mode for local testing.

## More Documentation

- [Add-on install and troubleshooting](./DOCS.md)
- [Main application README](../README.md)
- [Architecture overview](../architecture.md)
