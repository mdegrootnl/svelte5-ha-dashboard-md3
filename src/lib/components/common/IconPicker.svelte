<script lang="ts">
    interface Props {
        onselect: (icon: string) => void;
        onclose: () => void;
    }
    let { onselect, onclose }: Props = $props();
    import IconClose from "~icons/material-symbols/close";
    import IconSearch from "~icons/material-symbols/search";
    import { portal } from "$lib/actions/portal";

    // Comprehensive list of Material Symbols icons for smart home/dashboard use
    // Users can type any valid Material Symbols name to search
    const COMMON_ICONS = [
        // Home & Rooms
        "home",
        "bed",
        "bathtub",
        "kitchen",
        "chair",
        "weekend",
        "living",
        "dining",
        "meeting_room",
        "garage",
        "deck",
        "balcony",
        "door_front",
        "door_back",
        "window",
        "stairs",
        "roofing",
        "fence",
        "yard",

        // Lights & Power
        "lightbulb",
        "light",
        "fluorescent",
        "highlight",
        "wb_twilight",
        "sunny",
        "bedtime",
        "dark_mode",
        "nightlight",
        "brightness_high",
        "brightness_low",
        "brightness_medium",
        "flash_on",
        "bolt",
        "power",
        "outlet",
        "electrical_services",

        // Climate
        "thermostat",
        "ac_unit",
        "heat",
        "local_fire_department",
        "water_drop",
        "humidity_high",
        "humidity_low",
        "air",
        "mode_fan",
        "hvac",
        "device_thermostat",
        "thermometer",

        // Media & Entertainment
        "music_note",
        "tv",
        "speaker",
        "volume_up",
        "movie",
        "cast",
        "play_arrow",
        "pause",
        "skip_next",
        "skip_previous",
        "headphones",
        "radio",
        "album",
        "audiotrack",

        // Security & Safety
        "lock",
        "lock_open",
        "videocam",
        "sensors",
        "security",
        "shield",
        "emergency",
        "warning",
        "smoke_detector",
        "co2",
        "fire_extinguisher",
        "door_sensor",
        "motion_sensor",
        "key",

        // Devices & Connectivity
        "router",
        "wifi",
        "bluetooth",
        "devices",
        "smartphone",
        "tablet",
        "computer",
        "keyboard",
        "mouse",
        "usb",
        "memory",
        "sd_card",

        // Appliances
        "local_laundry_service",
        "microwave",
        "blender",
        "coffee_maker",
        "dishwasher",
        "vacuum",
        "iron",
        "refrigerator",
        "oven",

        // Window Coverings
        "curtains",
        "blinds",
        "vertical_shades",
        "roller_shades",

        // Transportation
        "directions_car",
        "bike_scooter",
        "electric_car",
        "garage_home",

        // Energy & Utilities
        "euro",
        "speed",
        "electric_meter",
        "gas_meter",
        "water",
        "solar_power",
        "battery_charging_full",
        "battery_full",
        "energy",

        // General UI
        "grid_view",
        "view_agenda",
        "dashboard",
        "home_app_logo",
        "apps",
        "settings",
        "tune",
        "palette",
        "schedule",
        "timer",
        "alarm",
        "calendar_today",
        "event",
        "notifications",
        "info",
        "help",

        // Actions
        "add",
        "remove",
        "edit",
        "delete",
        "check",
        "close",
        "refresh",
        "sync",
        "save",
        "download",
        "upload",
        "share",
        "favorite",

        // Nature & Weather
        "cloud",
        "thunderstorm",
        "rainy",
        "snowy",
        "foggy",
        "air",
        "park",
        "forest",
        "grass",
        "eco",
        "nature",
        "pets",
        "pest_control",
    ];

    let query = $state("");

    // Filter icons - also allow typing any icon name
    let filteredIcons = $derived(
        query.length === 0
            ? COMMON_ICONS
            : COMMON_ICONS.filter((icon) => icon.includes(query.toLowerCase())),
    );

    // Show the typed query as a potential custom icon if it's not in the list
    let showCustomIcon = $derived(
        query.length > 0 && !COMMON_ICONS.includes(query.toLowerCase()),
    );

    function handleSelect(icon: string) {
        onselect(icon);
    }
</script>

<div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
    onclick={() => onclose()}
    role="button"
    tabindex="-1"
    onkeydown={(e) => e.key === "Escape" && onclose()}
    use:portal
>
    <div
        class="bg-m3-surface-container-high rounded-m3-xl p-4 w-full max-w-md flex flex-col gap-4 shadow-xl"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="-1"
        onkeydown={() => {}}
    >
        <div class="flex items-center justify-between">
            <h3 class="text-m3-title-medium text-m3-on-surface">Select Icon</h3>
            <button
                onclick={() => onclose()}
                class="text-m3-on-surface-variant hover:text-m3-on-surface"
            >
                <IconClose class="size-6" />
            </button>
        </div>

        <!-- Search -->
        <div class="relative">
            <IconSearch
                class="absolute left-3 top-1/2 -translate-y-1/2 text-m3-on-surface-variant size-5"
            />
            <input
                type="text"
                bind:value={query}
                placeholder="Search or type any icon name..."
                class="w-full h-10 pl-10 pr-4 rounded-full bg-m3-surface-container-highest text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-m3-primary"
            />
        </div>

        <!-- Hint for custom icons -->
        {#if showCustomIcon}
            <p class="text-m3-body-small text-m3-on-surface-variant px-2">
                💡 "<strong>{query}</strong>" not in common icons. Type any
                valid
                <a
                    href="https://fonts.google.com/icons"
                    target="_blank"
                    class="text-m3-primary underline">Material Symbol</a
                > name and select it below.
            </p>
        {/if}

        <!-- Grid -->
        <div class="grid grid-cols-6 gap-2 max-h-72 overflow-y-auto p-1">
            {#if showCustomIcon}
                <!-- Custom icon option - shows text name, not icon preview -->
                <button
                    class="col-span-6 flex items-center justify-center gap-2 py-2 rounded-m3-sm bg-m3-primary-container text-m3-on-primary-container transition-colors focus:outline-none focus:ring-2 focus:ring-m3-primary"
                    onclick={() => handleSelect(query.toLowerCase())}
                    title="Use '{query}' as icon"
                >
                    <span class="material-symbols-outlined text-xl"
                        >add_circle</span
                    >
                    <span class="text-m3-label-large"
                        >Use "<strong>{query}</strong>" as icon</span
                    >
                </button>
            {/if}

            {#each filteredIcons as icon}
                <button
                    class="aspect-square flex flex-col items-center justify-center gap-1 rounded-m3-sm hover:bg-m3-surface-container-highest text-m3-on-surface-variant hover:text-m3-on-surface transition-colors focus:outline-none focus:ring-2 focus:ring-m3-primary/50"
                    onclick={() => handleSelect(icon)}
                    title={icon}
                >
                    <span class="material-symbols-outlined text-2xl"
                        >{icon}</span
                    >
                </button>
            {/each}
        </div>

        <p class="text-m3-body-small text-m3-on-surface-variant text-center">
            Browse all icons at <a
                href="https://fonts.google.com/icons"
                target="_blank"
                class="text-m3-primary underline">fonts.google.com/icons</a
            >
        </p>
    </div>
</div>
