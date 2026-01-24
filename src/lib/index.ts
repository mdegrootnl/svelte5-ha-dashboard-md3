// Types
export * from './types';
export * from './utils';
export { HistoryService } from './domain/historyService';

// Stores
export { haStore, HAStore } from './stores/ha.svelte';
export { haRegistryStore, HARegistryStore } from './stores/haRegistry.svelte';
export { themeStore, ThemeStore } from './stores/theme.svelte';
export { cardEditorStore, CardEditorStore } from './features/dashboard/stores/cardEditor.svelte';
export { dashboardStore, DashboardStore } from './features/dashboard/stores/dashboard.svelte';
export { dashboardEditorStore, DashboardEditorStore } from './features/dashboard/stores/dashboardEditor.svelte';
export { maStore, MusicAssistantStore } from './features/music/stores/maStore.svelte';
export { musicLibraryStore, MusicLibraryStore } from './features/music/stores/musicLibrary.svelte';

// MD3 Components
export { default as Button } from './components/md3/Button.svelte';
export { default as IconButton } from './components/md3/IconButton.svelte';
export { default as Card } from './components/md3/Card.svelte';
export { default as Checkbox } from './components/md3/Checkbox.svelte';
export { default as Chip } from './components/md3/Chip.svelte';
export { default as FAB } from './components/md3/FAB.svelte';
export { default as Radio } from './components/md3/Radio.svelte';
export { default as Switch } from './components/md3/Switch.svelte';
export { default as TextField } from './components/md3/TextField.svelte';
export { default as EntityPicker } from './components/md3/EntityPicker.svelte';
export { default as DynamicIcon } from './components/common/DynamicIcon.svelte';

// Card Components
export { default as ButtonCard } from './features/dashboard/components/cards/ButtonCard.svelte';
export { default as MediaCard } from './features/dashboard/components/cards/MediaCard.svelte';
export { default as ThermostatCard } from './features/dashboard/components/cards/ThermostatCard.svelte';
export { default as TitleCard } from './features/dashboard/components/cards/TitleCard.svelte';
export { default as GraphCard } from './features/dashboard/components/cards/GraphCard.svelte';
export { default as TabCard } from './features/dashboard/components/cards/TabCard.svelte';
export { default as NavigationCard } from './features/dashboard/components/cards/NavigationCard.svelte';

// Layout Components
export { default as NavigationRail } from './components/layout/NavigationRail.svelte';

export { default as PageShell } from './components/layout/PageShell.svelte';
export { default as ErrorBoundary } from './components/layout/ErrorBoundary.svelte';
export { default as GridContainer } from './components/layout/GridContainer.svelte';
export { default as GridItem } from './components/layout/GridItem.svelte';
export { default as GridOverlay } from './components/layout/GridOverlay.svelte';
export { default as GridConfigDialog } from './components/layout/GridConfigDialog.svelte';
export { default as CardConfigSheet } from './components/layout/CardConfigSheet.svelte';

// Dashboard Types (re-export for convenience)
export * from './types/dashboard';

// Music Assistant Types
export * from './types/musicAssistant';
