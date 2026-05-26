# Changelog

## 0.0.6

- Adds public-safe README screenshots and a reproducible screenshot capture script.
- Adds a standalone Docker server-side Home Assistant URL override for deployments where the browser URL and container-reachable URL differ.
- Passes the internal Home Assistant URL through Docker Compose so standalone deployments can keep OAuth and proxy traffic working without custom host mappings.

## 0.0.5

- Serves the dashboard directly for Home Assistant ingress root requests so the add-on does not redirect out of the ingress frame.

## 0.0.4

- Removes the explicit `/` ingress entry so Home Assistant generates a clean add-on ingress URL without a doubled slash.

## 0.0.3

- Fixes Home Assistant add-on startup crashes when Ingress sends a root request as `//`.

## 0.0.2

- Refreshes the dashboard library examples, including the max-capability robot vacuum card.
- Improves Music Assistant browsing, radio discovery, and navigation behavior.
- Updates graph, navigation, and documentation polish for the current dashboard state.

## 0.0.1

- Initial Home Assistant add-on packaging.
- Adds Ingress sidebar support.
- Stores dashboard data in `/data`.
- Uses server-side Supervisor API access for zero-config Home Assistant connectivity.
- Documents current parity with the standalone dashboard feature set, including Attention, Presence, specialist cards, graph analytics, and kiosk controls.
