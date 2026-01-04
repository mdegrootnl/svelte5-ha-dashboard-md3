<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { weatherStore } from "$lib/stores/weather.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";

    let mapContainer: HTMLDivElement;
    let map: any = null;
    let radarLayers: any[] = [];
    let currentFrameIndex = $state(0);
    let isPlaying = $state(false);
    let timestamps: Array<{ time: number; path: string }> = $state([]);
    let animationInterval: any;
    let L: any = null;

    // Reactive map style based on theme
    let mapStyle = $derived(themeStore.isDark ? "dark" : "light");

    onMount(async () => {
        // Dynamically import Leaflet (browser-only) - prevents SSR errors
        const leafletModule = await import("leaflet");
        L = leafletModule.default;

        // Import Leaflet CSS
        await import("leaflet/dist/leaflet.css");

        // Initialize map
        map = L.map(mapContainer, {
            center: [weatherStore.location.lat, weatherStore.location.lon],
            zoom: 8,
            zoomControl: true,
            attributionControl: true,
        });

        // Add base map tiles
        updateBaseMap();

        // Fetch and display radar data
        await loadRadarData();

        // Auto-play animation
        play();
    });

    onDestroy(() => {
        stop();
        if (map) {
            map.remove();
            map = null;
        }
    });

    function updateBaseMap() {
        if (!map || !L) return;

        // Remove existing tile layers
        map.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer) {
                map?.removeLayer(layer);
            }
        });

        // Carto base maps
        const baseUrls = {
            light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        };

        L.tileLayer(baseUrls[mapStyle === "dark" ? "dark" : "light"], {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
        }).addTo(map);
    }

    async function loadRadarData() {
        if (!L) return;

        try {
            const response = await fetch(
                "https://api.rainviewer.com/public/weather-maps.json",
            );
            const data = await response.json();

            // Get last 12 frames (1 hour of radar)
            timestamps = data.radar.past.slice(-12);

            // Create tile layers for each frame
            radarLayers = timestamps.map((frame, index) => {
                const layer = L.tileLayer(
                    `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
                    {
                        tileSize: 256,
                        opacity: 0.6,
                        zIndex: 10,
                    },
                );

                // Only show first frame initially
                if (index === 0 && map) {
                    layer.addTo(map);
                }

                return layer;
            });
        } catch (error) {
            console.error("Failed to load radar data:", error);
        }
    }

    function showFrame(index: number) {
        if (!map || radarLayers.length === 0) return;

        // Hide all layers
        radarLayers.forEach((layer) => {
            if (map?.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });

        // Show requested frame
        if (radarLayers[index]) {
            radarLayers[index].addTo(map);
        }

        currentFrameIndex = index;
    }

    function play() {
        if (isPlaying) return;
        isPlaying = true;

        animationInterval = setInterval(() => {
            const nextIndex = (currentFrameIndex + 1) % radarLayers.length;
            showFrame(nextIndex);
        }, 500); // 500ms per frame
    }

    function stop() {
        isPlaying = false;
        if (animationInterval) {
            clearInterval(animationInterval);
        }
    }

    function togglePlayPause() {
        if (isPlaying) {
            stop();
        } else {
            play();
        }
    }

    // React to theme changes
    $effect(() => {
        if (map && mapStyle) {
            updateBaseMap();
        }
    });
</script>

<div
    class="relative w-full h-[300px] md:h-[400px] rounded-3xl overflow-hidden border border-outline-variant bg-surface-container"
>
    <!-- Map Container -->
    <div bind:this={mapContainer} class="w-full h-full"></div>

    <!-- Animation Controls -->
    <div
        class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-container/90 backdrop-blur-sm px-4 py-2 rounded-full border border-outline-variant shadow-lg z-[1000]"
    >
        <button
            onclick={togglePlayPause}
            class="material-symbols-outlined text-on-surface hover:text-primary transition-colors cursor-pointer"
            aria-label={isPlaying ? "Pause" : "Play"}
        >
            {isPlaying ? "pause" : "play_arrow"}
        </button>

        <div class="flex items-center gap-1">
            {#each timestamps as _, i}
                <div
                    class="w-1.5 h-1.5 rounded-full transition-colors cursor-pointer hover:bg-primary"
                    class:bg-primary={i === currentFrameIndex}
                    class:bg-outline-variant={i !== currentFrameIndex}
                    onclick={() => showFrame(i)}
                    onkeydown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            showFrame(i);
                        }
                    }}
                    role="button"
                    tabindex="0"
                    aria-label={`Frame ${i + 1}`}
                ></div>
            {/each}
        </div>

        <span class="text-label-sm text-on-surface ml-2">
            {timestamps[currentFrameIndex]
                ? new Date(
                      timestamps[currentFrameIndex].time * 1000,
                  ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : ""}
        </span>
    </div>
</div>

<style>
    /* Override Leaflet's default styles to match our theme */
    :global(.leaflet-container) {
        font-family: "Inter", sans-serif;
    }

    :global(.leaflet-control-attribution) {
        font-size: 10px;
        background: rgba(255, 255, 255, 0.7) !important;
        backdrop-filter: blur(4px);
    }
</style>
