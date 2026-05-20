# MD3 Dashboard Add-On

## Installation

1. Add this repository to the Home Assistant add-on store:
   `https://github.com/mdegrootnl/svelte5-ha-dashboard-md3`
2. Install **MD3 Dashboard**.
3. Start the add-on and open it from the Home Assistant sidebar.

## Persistence

The add-on stores dashboard settings, themes, uploads, provider keys, and generated layout data in Home Assistant's add-on `/data` volume. This data is included in normal Home Assistant add-on backups.

## Home Assistant Connection

When the add-on runs inside Home Assistant, it uses the Supervisor-provided Home Assistant API token server-side. The browser only receives a local dashboard session token, not `SUPERVISOR_TOKEN`.

The existing OAuth and long-lived token connection flow remains available for Docker and other standalone deployments.

## Network

Ingress is enabled by default. The optional direct web port `3000` is disabled unless the user maps it in the add-on network settings.

## Troubleshooting

- If the sidebar view is blank, restart the add-on and check the add-on logs.
- If Home Assistant entities do not appear, confirm the add-on has started after Home Assistant Core and that the log does not mention a missing Supervisor token.
- If images do not load, verify that the add-on is opened through the sidebar Ingress entry rather than a stale direct URL.
