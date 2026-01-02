<script lang="ts">
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";
	import NavigationRail from "$lib/components/NavigationRail.svelte";
	import { themeStore } from "$lib/stores/theme.svelte";

	let { children } = $props();

	// Initialize theme effect
	$effect(() => {
		// Accessing the store property to ensure reactivity if needed,
		// though the store's constructor sets up its own root effect.
		// Merely importing it might be enough if it's effortless, but
		// using it here ensures it's alive.
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
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen bg-m3-surface">
	<NavigationRail />
	<main class="flex-1 overflow-auto bg-m3-surface">
		{@render children()}
	</main>
</div>
