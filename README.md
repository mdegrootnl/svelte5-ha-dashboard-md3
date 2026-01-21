# Home Assistant Dashboard

A modern Material Design 3 dashboard for Home Assistant with dynamic theming, built with **Svelte 5** and **SvelteKit**.

## Features

### 🏠 Home Assistant Integration
- Real-time entity sync via WebSocket
- Entity Registry support for automatic dashboard generation
- Floor and room-based navigation
- History API integration for graphs and charts

### 🎨 Dynamic MD3 Theming
- Generate themes from any source color
- Real-time theme preview and customization
- Persistent dark mode preferences
- Full MD3 color token support

### 🎛️ Dashboard Engine
- **Decoupled Architecture** — Clean separation between Auth, Registry, and Component state.
- **Monadic Error Handling** — Robust error propagation using the `Result` type.
- **Type Sovereignty** — Zod-validated data boundaries for ultimate reliability.
- **Configurable Grid** — Full drag-and-drop support with responsive breakpoints.
- **Auto-Generation** — Intelligent layout generation from Entity Registry metadata.

### 🎛️ Entity Cards
- **Button Card** — Switch/slider variants for lights, fans, and switches
- **Media Card** — Secure artwork proxying for reliable production display
- **Thermostat Card** — Fully resizable climate control with integrated history graphs

### 🌤️ Weather Dashboard
- Weather hero display with current conditions
- Hourly and daily forecast strips
- Interactive rain radar (Leaflet + Buienradar)
- Rain precipitation graph
- Specialized widgets:
  - UV Index
  - Wind speed and direction
  - Atmospheric pressure
  - Humidity
  - Sunrise/Sunset
  - Air Quality Index (AQI)

### 🎵 Music Assistant
- **Native Integration** — Direct control of Music Assistant via HA WebSocket.
- **Media Browsing** — Browse Artists, Albums, Tracks, Playlists, and Radio.
- **Unified Player** — Control all MA-enabled players with a rich UI.
- **Global Search** — Search your entire music library instantly.

### ✏️ Dashboard Editor
- **Drag & Drop** — Rearrange cards effortlessly.
- **Live Configuration** — Edit card settings directly on the dashboard.


### 🎨 MD3 Component Library
- Button (filled, tonal, outlined, text, elevated)
- Card (elevated, filled, outlined)
- TextField with validation and outlined variant
- Switch, Checkbox, Radio controls
- Chip (filter and action variants)
- FAB (floating action button)
- EntityPicker for entity selection

### 🔐 Security Hardened
- Strict CSP headers
- Input validation
- Rate limiting on service calls
- HTTPS by default

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run check

# Docker
docker compose up --build
```

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── md3/          # Material Design 3 primitives
│   │   ├── cards/        # Entity cards (Button, Media, Thermostat)
│   │   ├── layout/       # Navigation, grids, dialogs
│   │   └── weather/      # Weather components and widgets
│   ├── stores/           # Svelte 5 rune-based stores
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Helper functions
├── routes/
│   ├── dashboard/        # Main dashboard with floor/room routing
│   ├── music/            # Music Assistant browser
│   ├── weather/          # Weather dashboard

│   ├── library/          # Component showcase
│   ├── settings/         # HA connection config
│   └── theme/            # Theme builder
└── tests/                # Test setup
```

## Configuration

1. Navigate to **Settings**
2. Enter your Home Assistant URL (e.g., `homeassistant.local`)
3. Choose authentication method:
   - **OAuth** — Redirects to HA for authentication
   - **Long-Lived Token** — Paste a token from HA profile settings
4. Click **Connect**

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Svelte 5](https://svelte.dev) with runes (`$state`, `$derived`, `$effect`) |
| Routing | [SvelteKit](https://kit.svelte.dev) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Theming | [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) |
| HA Integration | [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) |
| Validation | [Zod](https://zod.dev) |
| Testing | [Vitest](https://vitest.dev) + [@testing-library/svelte](https://testing-library.com/svelte) |
| Icons | [Iconify](https://iconify.design) via unplugin-icons |
| Data Viz | [D3.js](https://d3js.org) |
| Maps | [Leaflet](https://leafletjs.com) |


## 🚀 Deployment & Persistence

Configuration (themes, layouts, dashboards) is stored server-side in a JSON file with localStorage caching:

### How It Works
- **Page load**: Server provides config from `./data/config.json`
- **User changes**: Saved to localStorage immediately, then synced to server after 2 seconds
- **Page refresh**: Server config is loaded (source of truth)
- **Cross-device**: Changes persist across all browsers/devices

### Deployment Requirements
- **Node.js**: Ensure the process has write permissions to `./data/`
- **Docker**: You **MUST** mount a volume to persist settings:
  ```bash
  -v $(pwd)/data:/app/data
  ```

See [Deployment Guide](./deployment.md) for full details.

## Documentation

- [Architecture Overview](./architecture.md) — Detailed technical documentation
- [Security Risks](./securityrisks.md) — Security audit and hardening measures

## License

MIT
