<script lang="ts">
    import { themeStore } from "$lib/stores/theme.svelte";
</script>

<div class="p-8 bg-m3-surface min-h-screen">
    <header class="mb-8">
        <h1 class="text-m3-display-small font-bold text-m3-primary">
            {themeStore.t("dashboard.title")}
        </h1>
        <p class="text-m3-body-large text-m3-on-surface-variant">
            {themeStore.t("home.welcome")}
        </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Placeholder Cards -->
        <div
            class="bg-m3-surface-container-high rounded-m3-xl p-6 h-48 border border-m3-outline-variant flex items-center justify-center text-m3-on-surface-variant"
        >
            {themeStore.t("home.placeholder")}
        </div>
        <div
            class="bg-m3-surface-container-high rounded-m3-xl p-6 h-48 border border-m3-outline-variant flex items-center justify-center text-m3-on-surface-variant"
        >
            {themeStore.t("home.placeholder")}
        </div>
        <div
            class="bg-m3-surface-container-high rounded-m3-xl p-6 h-48 border border-m3-outline-variant flex items-center justify-center text-m3-on-surface-variant"
        >
            {themeStore.t("home.placeholder")}
        </div>
    </div>
</div>
