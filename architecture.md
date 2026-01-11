# Architecture Overview

**Last Updated**: January 11, 2026

A Material Design 3 dashboard for Home Assistant built with **Svelte 5** and **SvelteKit**.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Svelte 5](https://svelte.dev) with runes (`$state`, `$derived`, `$effect`) |
| Routing | [SvelteKit](https://kit.svelte.dev) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Theming | [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) |
| HA Integration | [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) |
| Testing | [Vitest](https://vitest.dev) + [@testing-library/svelte](https://testing-library.com/svelte) |
| Icons | [Iconify](https://iconify.design) via unplugin-icons |
| Validation | [Zod](https://zod.dev) (Schema validation) |
| Error Handling | [Monadic Result](src/lib/utils/result.ts) (Safe error propagation) |
| Data Viz | [D3.js](https://d3js.org) (Graphs) |
| Maps | [Leaflet](https://leafletjs.com) (Radar) |

---

## Project Structure

```
src/
├── app.css              # Global styles & Tailwind config
├── app.html             # HTML template
├── hooks.server.ts      # Security headers (CSP, X-Frame-Options)
├── lib/
│   ├── index.ts         # Public exports barrel
│   ├── components/
│   │   ├── md3/         # Material Design 3 primitives
│   │   ├── cards/       # Entity cards (Button, Media)
│   │   └── layout/      # Page shells, error boundaries
│   ├── stores/          # Svelte 5 rune-based stores
│   ├── types/           # TypeScript interfaces
│   ├── domain/          # Pure domain logic & services
│   └── utils/           # Helper functions
├── routes/
│   ├── +layout.svelte   # Root layout with NavigationRail
│   ├── dashboard/       # Main control dashboard
│   ├── library/         # Component showcase
│   ├── settings/        # HA connection config
│   └── theme/           # Theme customization
└── tests/               # Test setup & utilities
```

---

## Component Hierarchy

```mermaid
graph TD
        A[+layout.svelte] --> B[NavigationRail]
        A --> C[CardConfigDialog]
        A --> D[PageShell]
        D --> NH[NavigationHub]
        D --> GC[GridContainer]
    end

    subgraph MD3 Primitives
        E[Button]
        F[Card]
        G[TextField]
        H[Switch]
        I[Checkbox]
        J[Radio]
        K[Chip]
        L[FAB]
    end

    subgraph Entity Cards
        M[ButtonCard] --> E
        M --> H
        N[MediaCard] --> F
    end

    subgraph Layout Components
        D --> O[ErrorBoundary]
    end
```

### MD3 Primitives (`src/lib/components/md3/`)

Reusable Material Design 3 components with full theming support:

- **Button** — filled, tonal, outlined, text, elevated variants
- **Card** — elevated, filled, outlined variants
- **TextField** — with validation and helper text
- **Switch, Checkbox, Radio** — form controls
- **Chip** — filter and action chips
- **FAB** — floating action button

### Entity Cards (`src/lib/components/cards/`)

Home Assistant entity control cards:

- **ButtonCard** — switch/slider variants for lights, fans, switches
- **MediaCard** — standard, poster, condensed variants for media players
- **ThermostatCard** — climate control with history graph, supports secondary outdoor sensor

### Layout (`src/lib/components/layout/`)

- **PageShell** — consistent page wrapper with title
- **NavigationHub** — Floor/Room navigation center
- **GridContainer/GridItem** — CSS Grid-based dashboard layout engine
- **ErrorBoundary** — graceful error handling

---

## State Management

All stores use Svelte 5 runes for fine-grained reactivity:

### HA Integration Layer

The "God Object" HAStore has been decomposed into specialized, decoupled modules adhering to the Single Responsibility Principle:

- **HAAuthService** (`src/lib/domain/haAuthService.ts`) — Encapsulates OAuth and token refresh logic.
- **HARegistryStore** (`src/lib/stores/haRegistry.svelte.ts`) — Manages areas, floors, and entity registry metadata.
- **HAStore** (`src/lib/stores/ha.svelte.ts`) — Unified reactive interface for states and service calls.
- **StorageProvider** (`src/lib/utils/storageProvider.ts`) — Abstracted persistence for tokens and session data.
- **HistoryService** (`src/lib/domain/historyService.ts`) — Pure logic for transforming raw HA history into graphable data.

### WeatherStore (`src/lib/stores/weather.svelte.ts`)
    
Manages weather data with background polling and Zod-guaranteed type safety:

- **Poller Service** — Centralized background task management.
- **Zod Validation** — Incoming API responses are validated against schemas before use.
- **Monadic Handling** — All fetch operations return a `Result<T, E>` type.
    
Manages weather data fetching (HA integration), caching, and normalization:

```typescript
class WeatherStore {
    data = $state<WeatherData | null>(null);
    loading = $state(false);
    
    fetch(force?); // Fetches from HA weather entities
    getIconUrl(code, isDay, isDark); // Maps WMO codes to assets
    // Features: Throttling (5m), Day/Night calculation, Fallback strategies
}
```

### ThemeStore (`src/lib/stores/theme.svelte.ts`)

Dynamic MD3 theming with CSS custom properties and server persistence:

```typescript
class ThemeStore {
    sourceColor = $state('#6750A4');
    isDark = $state(false);
    theme = $derived.by(() => themeFromSourceColor(argbFromHex(this.sourceColor)));
    
    init(config);              // Load from server on page load
    toggleDark();              // Toggle + persist
    setSourceColor(color);     // Update + persist
    private applyToDocument(); // Sets --color-m3-* CSS variables
}
```

**Persistence**: localStorage (immediate) + server sync (2s debounce)

### CardEditorStore (`src/lib/stores/cardEditor.svelte.ts`)

Dialog state for card configuration:

```typescript
class CardEditorStore {
    isOpen = $state(false);
    config = $state<CardConfig | null>(null);
    
    open(config);
    close();
    save();
}
```

### DashboardStore (`src/lib/stores/dashboard.svelte.ts`)

Manages grid configurations, layout persistence, and responsive breakpoints:

```typescript
class DashboardStore {
    config = $state<RoomDashboardConfig | null>(null);
    savedConfigs = $state<Record<string, RoomDashboardConfig>>({});
    
    init(configs);         // Load from server on page load
    setConfig(config);     // Save + persist changes
    persistChanges();      // localStorage (immediate) + server (debounced)
}
```

**Persistence Strategy**:
- **Server**: Source of truth (`/api/settings` → `./data/config.json`)
- **localStorage**: Fast caching for instant local updates
- **Debounced sync**: 2-second delay prevents excessive server writes


---

## Routing

| Route | Purpose |
|-------|---------|
| `/` | Landing / redirect |
| `/dashboard` | Main control interface (Home) |
| `/dashboard/[[floor]]/[[room]]` | Dynamic floor & room dashboards |
| `/library` | Component showcase |
| `/settings` | Home Assistant connection |
| `/theme` | Theme builder |
| `/weather` | Weather dashboard & Rain radar |
| `/api/ha-proxy` | Secure generic proxy for HA resources (images/icons) |
| `/ha-history` | Proxy for Home Assistant history API |

---

## Security

Security measures implemented in `hooks.server.ts`:

| Header | Value |
|--------|-------|
| Content-Security-Policy | Strict CSP with required exceptions |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | Restricts geolocation, microphone, camera |

Additional hardening:
- HTTPS default for HA connections
- Input validation on host/port fields
- Rate limiting (debounce) on service calls
- No XSS-prone patterns (`innerHTML`, `@html`, `eval`)

See [securityrisks.md](./securityrisks.md) for the full security audit.

---

## Testing

Test infrastructure using Vitest with Testing Library:

```bash
npm test        # Run tests in watch mode
npm test -- --run --coverage  # Run with coverage
```

### Coverage

All components have corresponding `.test.ts` files:

- `src/lib/components/md3/*.test.ts` — MD3 primitives
- `src/lib/components/cards/*.test.ts` — Entity cards
- `src/lib/components/layout/*.test.ts` — Layout components
- `src/lib/stores/*.test.ts` — Store unit tests
- `src/lib/utils/*.test.ts` — Utility functions

---

## Data Flow

```mermaid
sequenceDiagram
    participant User
    participant ButtonCard
    participant HAStore
    participant HA as Home Assistant

    User->>ButtonCard: Toggle switch
    ButtonCard->>HAStore: callService('light', 'toggle', {entity_id})
    HAStore->>HA: WebSocket message
    HA-->>HAStore: State update (subscribeEntities)
    HAStore-->>ButtonCard: states[entity_id] reactive update
    ButtonCard-->>User: UI reflects new state
```

### Dashboard Generation Flow

```mermaid
sequenceDiagram
    participant HAStore
    participant Registry as HA Registry
    participant Generator as DashboardGenerator
    participant Store as DashboardStore

    HAStore->>Registry: Fetch Areas, Floors, Entities
    Registry-->>HAStore: Return Registry Data
    
    Note over Generator: User navigates to room
    
    HAStore->>Generator: generateDashboardForArea(room)
    Generator->>Generator: Filter entities by area_id
    Generator->>Generator: Sort by priority (Climate > Media...)
    Generator->>Generator: Pack items (Bento algorithm)
    Generator-->>Store: Return GridConfig
    Store-->>UI: Render GridContainer
```

---

## Perfect Project Standards

1. **Domain-Driven Design (DDD)** — Complex logic is extracted from stores into pure, testable domain services.
2. **Type Sovereignty** — Use of `Zod` schemas at all data boundaries (APIs, LocalStorage).
3. **Monadic Error Handling** — Consistent use of the `Result` type to prevent swallowed exceptions.
4. **Fine-Grained Reactivity** — Pure Svelte 5 Runes architecture for predictable state updates.
5. **Decoupled Architecture** — Singleton stores are decomposed into specialized modules to avoid God Objects.

---

## Key Design Decisions

1. **Svelte 5 Runes** — Fine-grained reactivity without stores boilerplate
2. **Class-based Stores** — Encapsulated state with methods, exported as singletons
3. **MD3 Dynamic Theming** — Real-time theme generation from any source color
4. **Component-First Architecture** — Reusable MD3 primitives composed into entity cards
5. **CSP-First Security** — Strict Content Security Policy from day one
