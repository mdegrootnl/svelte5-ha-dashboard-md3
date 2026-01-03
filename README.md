# Home Assistant Dashboard

A modern Material Design 3 dashboard for Home Assistant with dynamic theming, built with **Svelte 5** and **SvelteKit**.

## Features

- 🏠 **Home Assistant Integration** — Real-time entity sync via WebSocket
- 🎨 **Dynamic MD3 Theming** — Generate themes from any source color
- 🌙 **Persistent Dark Mode** — Theme preferences saved to localStorage
- 🎚️ **Slider & Switch Cards** — Control lights, fans, and switches
- 🎵 **Media Cards** — Standard, poster, and condensed variants
- 🔐 **Security Hardened** — CSP headers, input validation, rate limiting

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
```

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable UI components
│   │   ├── md3/        # Material Design 3 primitives
│   │   ├── cards/      # Entity cards (Button, Media)
│   │   └── layout/     # Page shells, navigation
│   ├── stores/         # Svelte 5 rune-based stores
│   ├── types/          # TypeScript interfaces
│   └── utils/          # Helper functions
├── routes/
│   ├── dashboard/      # Main control dashboard
│   ├── library/        # Component showcase
│   ├── settings/       # HA connection config
│   └── theme/          # Theme customization
└── tests/              # Test setup
```

## Configuration

1. Navigate to **Settings**
2. Enter your Home Assistant URL (e.g., `homeassistant.local`)
3. Click **Connect** — you'll be redirected to HA for authentication

## Tech Stack

- [Svelte 5](https://svelte.dev) with runes (`$state`, `$derived`, `$effect`)
- [SvelteKit](https://kit.svelte.dev) for routing
- [Tailwind CSS 4](https://tailwindcss.com) for styling
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) for theming
- [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) for HA integration
- [Vitest](https://vitest.dev) for testing

## License

MIT
