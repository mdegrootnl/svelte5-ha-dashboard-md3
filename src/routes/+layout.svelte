<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";
	import NavigationRail from "$lib/components/layout/NavigationRail.svelte";
	import BottomNav from "$lib/components/layout/BottomNav.svelte";
	import ModernNavBar from "$lib/components/layout/ModernNavBar.svelte";

	import { themeStore } from "$lib/stores/theme.svelte";
	import { dashboardStore } from "$lib/features/dashboard/stores/dashboard.svelte";
	import { musicLibraryStore } from "$lib/features/music/stores/musicLibrary.svelte";
	import { setAppBasePath, withBase } from "$lib/utils/appBase";
	import type { AppConfig } from "$lib/types/config";

	import { browser } from "$app/environment";
	import type { Component } from "svelte";
	import LockScreen from "$lib/features/lockscreen/components/LockScreen.svelte";
	import { lockScreenStore } from "$lib/features/lockscreen/stores/lockscreen.svelte";
	import KioskIdleOverlay from "$lib/features/kiosk/components/KioskIdleOverlay.svelte";
	import { kioskStore } from "$lib/features/kiosk/stores/kiosk.svelte";
	import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";
	import { entityDetailStore } from "$lib/features/dashboard/stores/entityDetail.svelte";
	import { haStore } from "$lib/stores/ha.svelte"; // Ensure HA initializes

	let { data, children } = $props();

	// Track if stores have been initialized (prevents re-init on every render)
	let initialized = false;
	let configRefresh: Promise<void> | null = null;
	let CardLibrarySheetComponent = $state<Component<any> | null>(null);
	let CardConfigSheetComponent = $state<Component<any> | null>(null);
	let IconPickerComponent = $state<Component<any> | null>(null);
	let EntityDetailSheetComponent = $state<Component<any> | null>(null);

	function applyConfigFromServer(config: AppConfig) {
		themeStore.applyServerConfig(config.theme);
		dashboardStore.applyServerConfig(config.dashboards, config.pages);

		if (config.musicLibrary) {
			musicLibraryStore.applyServerConfig(config.musicLibrary);
		}

		if (config.lockScreen) {
			lockScreenStore.applyServerConfig(config.lockScreen);
		}

		if (config.kiosk) {
			kioskStore.applyServerConfig(config.kiosk);
		}
	}

	async function refreshConfigFromServer() {
		if (configRefresh) return configRefresh;

		configRefresh = (async () => {
			const response = await fetch(withBase("/api/settings"));
			if (!response.ok) {
				throw new Error(`Config refresh failed (${response.status})`);
			}

			const config = (await response.json()) as AppConfig;
			applyConfigFromServer(config);
		})().finally(() => {
			configRefresh = null;
		});

		return configRefresh;
	}

	// Initialize stores with server data (runs ONCE on initial load)
	$effect(() => {
		if (initialized) return;
		initialized = true;

		if (browser) {
			setAppBasePath(data.deployment?.ingressPath || "");
		}

		themeStore.init(data.config.theme);
		dashboardStore.init(data.config.dashboards, data.config.pages);
		if (data.config.musicLibrary) {
			musicLibraryStore.init(data.config.musicLibrary);
		}
		lockScreenStore.init(data.config.lockScreen);
		kioskStore.init(data.config.kiosk);
		if (browser) {
			haStore.init(data.deployment);

			const events = new EventSource(withBase("/api/events"));
			events.addEventListener("update", () => {
				refreshConfigFromServer().catch((error) => {
					console.error("Failed to refresh config from server:", error);
				});
			});

			return () => {
				events.close();
			};
		}
	});

	// Flush pending syncs on page unload
	$effect(() => {
		if (!browser) return;

		const handleUnload = () => {
			themeStore.flushSync();
			dashboardStore.flushSync();
			musicLibraryStore.flushSync();
			kioskStore.flushSync();
		};

		window.addEventListener("beforeunload", handleUnload);

		return () => {
			window.removeEventListener("beforeunload", handleUnload);
		};
	});

	// Card editing is global because reusable dashboard cards can appear on
	// routes outside /dashboard, such as the card library preview page.
	$effect(() => {
		if (cardEditorStore.mode === "library" && !CardLibrarySheetComponent) {
			import("$lib/components/layout/CardLibrarySheet.svelte").then((module) => {
				CardLibrarySheetComponent = module.default;
			});
		}

		if (cardEditorStore.mode === "config" && !CardConfigSheetComponent) {
			import("$lib/components/layout/CardConfigSheet.svelte").then((module) => {
				CardConfigSheetComponent = module.default;
			});
		}

		if (cardEditorStore.isIconPickerOpen && !IconPickerComponent) {
			import("$lib/components/common/IconPicker.svelte").then((module) => {
				IconPickerComponent = module.default;
			});
		}

		if (entityDetailStore.open && !EntityDetailSheetComponent) {
			import("$lib/features/dashboard/components/EntityDetailSheet.svelte").then((module) => {
				EntityDetailSheetComponent = module.default;
			});
		}
	});

	// Apply theme changes
	$effect(() => {
		const _ = themeStore.theme;
	});

	// Backend config is shared live through /api/events. Stores only persist on
	// explicit user mutations, so applying a server refresh does not write back.
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link
		rel="preconnect"
		href="https://fonts.gstatic.com"
		crossorigin="anonymous"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<link
		href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
		rel="stylesheet"
	/>
	<title>{themeStore.t("app.title")}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<LockScreen />
<KioskIdleOverlay />

<div
	class="kiosk-shell flex flex-col xl:flex-row h-screen bg-m3-surface overflow-hidden"
	data-kiosk-enabled={kioskStore.enabled ? "true" : "false"}
	data-kiosk-dimmed={kioskStore.isDimmed ? "true" : "false"}
	data-kiosk-nav-hidden={kioskStore.isNavigationHidden ? "true" : "false"}
	data-kiosk-edit-locked={kioskStore.isEditLocked ? "true" : "false"}
	data-kiosk-density={kioskStore.effectiveDensity}
	data-kiosk-device-nav={kioskStore.deviceNavigationMode}
>
	<!-- Standard Navigation Rail (Desktop Only) -->
	{#if themeStore.navigationStyle === "standard"}
		<div class="kiosk-navigation hidden xl:block h-full">
			<NavigationRail />
		</div>
	{/if}

	<!-- Modern Navigation (Desktop & Mobile) handled inside the component -->
	{#if themeStore.navigationStyle === "modern"}
		<div class="kiosk-navigation">
			<ModernNavBar />
		</div>
	{/if}

	<main
		class="kiosk-main flex-1 overflow-hidden bg-m3-surface transition-all duration-300
        {themeStore.navigationStyle === 'modern' ? 'xl:pl-28' : ''}"
	>
		{@render children()}
	</main>

	<!-- Standard Bottom Nav (Mobile Only) -->
	{#if themeStore.navigationStyle === "standard"}
		<div class="kiosk-bottom-navigation xl:hidden fixed bottom-0 left-0 right-0 z-50">
			<BottomNav />
		</div>
	{/if}
</div>

{#if CardLibrarySheetComponent && cardEditorStore.mode === "library"}
	<CardLibrarySheetComponent />
{/if}

{#if CardConfigSheetComponent && cardEditorStore.mode === "config"}
	<CardConfigSheetComponent />
{/if}

{#if IconPickerComponent && cardEditorStore.isIconPickerOpen}
	<IconPickerComponent
		onselect={(icon: string) => cardEditorStore.handleIconSelect(icon)}
		onclose={() => (cardEditorStore.isIconPickerOpen = false)}
	/>
{/if}

{#if EntityDetailSheetComponent && entityDetailStore.open}
	<EntityDetailSheetComponent />
{/if}
