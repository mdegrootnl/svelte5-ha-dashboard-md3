# MD3 Dashboard Add-On

The Home Assistant add-on runs the same dashboard application described in the root [README](../README.md), but with Home Assistant sidebar ingress, persistent `/data`, and Supervisor-backed Home Assistant access.

## Installation

1. Add this repository to the Home Assistant add-on store:
   `https://github.com/mdegrootnl/svelte5-ha-dashboard-md3`
2. Install **MD3 Dashboard**.
3. Start the add-on and open it from the Home Assistant sidebar.

The first launch should open directly into the dashboard shell. From Settings you can choose language, theme, navigation, lock screen, kiosk behavior, Music Assistant defaults, Mealie, Albert Heijn, image providers, and other optional integrations.

## Persistence

The add-on stores dashboard settings, themes, uploads, provider keys, generated layout data, music-library favorites, lock screen settings, and kiosk settings in Home Assistant's add-on `/data` volume. This data is included in normal Home Assistant add-on backups.

Shared household state is backend-backed so dashboard layouts, navigation, language, theme, music favorites, and default player sync across devices. Browser storage is only used for fast cache, one-time migration, or explicit per-device tablet/kiosk preferences.

## Home Assistant Connection

When the add-on runs inside Home Assistant, it uses the Supervisor-provided Home Assistant API token server-side. The browser only receives a local dashboard session token, not `SUPERVISOR_TOKEN`.

The existing OAuth and long-lived token connection flow remains available for Docker and other standalone deployments.

The add-on proxies Home Assistant REST, history, statistics, media-source, and WebSocket calls through the server so ingress paths and Supervisor credentials remain transparent to the frontend.

## Network

Ingress is enabled by default. The optional direct web port `3000` is disabled unless the user maps it in the add-on network settings.

Use `npm run preview:addon` from the repository root to test an ingress-like base path locally.

## Release Validation

Before publishing a new add-on version, run:

```bash
npm test -- --run src/tests/addonManifest.test.ts
npm test -- --run src/lib/server/supervisorProxy.test.ts
npm test -- --run "src/routes/api/addon/core/[...path]/server.test.ts"
npm run test:e2e -- e2e/ingress.spec.ts
```

The manifest test checks that `package.json`, `ha-dashboard/config.yaml`, `ha-dashboard/CHANGELOG.md`, and `repository.yaml` agree on the version, public repository URL, GHCR image, ingress settings, and persistent `/data` setup. The Supervisor proxy tests verify that zero-config Home Assistant calls are gated to add-on browser auth, forwarded to the Supervisor core URL, strip browser-only headers, preserve query/body data, and use only the server-side `SUPERVISOR_TOKEN` upstream. The ingress smoke test verifies the local add-on preview path still loads the dashboard and keeps app links/API calls under the Home Assistant ingress prefix.

## Feature Notes

- The dashboard generator and editor behave the same as standalone mode.
- Music Assistant favorites and the default player are stored server-side and sync across tablets.
- Radio browsing prefers Home Assistant Radio Browser country feeds when available.
- Mealie remains the recipe and meal-planning source of truth, with optional Albert Heijn shopping export for Dutch households.
- Kiosk mode can dim, hide navigation, lock edit controls, and use browser wake lock where supported.
- Add-on CSP defaults are narrower than standalone compatibility mode.

## Troubleshooting

- If the sidebar view is blank, restart the add-on and check the add-on logs.
- If Home Assistant entities do not appear, confirm the add-on has started after Home Assistant Core and that the log does not mention a missing Supervisor token.
- If images do not load, verify that the add-on is opened through the sidebar Ingress entry rather than a stale direct URL.
- If Music Assistant or Radio Browser data is missing, confirm those integrations are available in Home Assistant and that media-source calls work from the Home Assistant media browser.
- If shared settings do not appear on another tablet, refresh the other browser and check that `/api/events` is reachable through ingress.
