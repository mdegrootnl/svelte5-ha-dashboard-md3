<script lang="ts">
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    // Horizontal scroll container with pill shapes
</script>

<div class="w-full overflow-x-auto no-scrollbar pb-2">
    <div class="flex gap-4 min-w-max px-1">
        {#if weatherStore.data}
            {@const currentHour = new Date().getHours()}
            {@const currentDay = new Date().getDate()}
            {#each weatherStore.data.hourly as hour}
                {@const isCurrent =
                    hour.time.getHours() === currentHour &&
                    hour.time.getDate() === currentDay}
                <div
                    class="flex flex-col items-center justify-between min-w-[70px] h-[140px] p-3 rounded-m3-md transition-colors duration-200 {isCurrent
                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                        : 'bg-m3-surface-container-highest text-m3-on-surface hover:bg-m3-surface-container-high'}"
                >
                    <span class="text-label-medium font-medium opacity-80">
                        {hour.time.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>

                    <img
                        src={weatherStore.getIconUrl(
                            hour.code,
                            hour.isDay,
                            themeStore.isDark,
                        )}
                        alt="icon"
                        class="w-8 h-8 drop-shadow-sm"
                    />

                    <span class="text-title-medium font-bold mb-1"
                        >{Math.round(hour.temp)}°</span
                    >
                </div>
            {/each}
        {:else}
            <!-- Skeletons -->
            {#each Array(10) as _}
                <div
                    class="min-w-[70px] h-[140px] rounded-full bg-surface-variant/20 animate-pulse"
                ></div>
            {/each}
        {/if}
    </div>
</div>
