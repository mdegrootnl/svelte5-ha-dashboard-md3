<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";
	import NavigationRail from "$lib/components/layout/NavigationRail.svelte";
	import BottomNav from "$lib/components/layout/BottomNav.svelte";

	import { themeStore } from "$lib/stores/theme.svelte";

	let { children } = $props();

	// Initialize theme effect
	$effect(() => {
		const _ = themeStore.theme;
	});
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
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col md:flex-row h-screen bg-m3-surface overflow-hidden">
	<div class="hidden md:block h-full">
		<NavigationRail />
	</div>

	<main class="flex-1 overflow-auto bg-m3-surface pb-20 md:pb-0">
		{@render children()}
	</main>

	<!-- Mobile Bottom Nav -->
	<div class="md:hidden fixed bottom-0 left-0 right-0 z-50">
		<BottomNav />
	</div>
</div>
