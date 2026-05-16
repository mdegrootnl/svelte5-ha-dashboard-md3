<script>
    import { browser } from "$app/environment";
    import { haStore } from "$lib/stores/ha.svelte";
    let { entityId, theme = "light", color = "" } = $props();
    let entity = $derived(haStore.getEntity(entityId));

    let duration = $derived(entity?.attributes?.media_duration || 0);
    let positionBase = $derived(entity?.attributes?.media_position || 0);
    let positionUpdatedAt = $derived(
        entity?.attributes?.media_position_updated_at,
    );
    let mediaState = $derived(entity?.state);

    let currentPosition = $state(0);
    /** @type {HTMLElement | undefined} */
    let root = $state();
    let isInViewport = $state(false);
    let isDocumentVisible = $state(true);
    let shouldTick = $derived(
        mediaState === "playing" && isInViewport && isDocumentVisible,
    );
    /** @type {ReturnType<typeof setInterval> | undefined} */
    let timer;

    function updatePosition() {
        if (mediaState === "playing" && positionUpdatedAt && duration > 0) {
            const now = new Date().getTime();
            const updated = new Date(positionUpdatedAt).getTime();
            const diff = (now - updated) / 1000;
            currentPosition = Math.min(positionBase + diff, duration);
        } else {
            currentPosition = positionBase;
        }

    }

    function clearTimer() {
        if (!timer) return;
        clearInterval(timer);
        timer = undefined;
    }

    $effect(() => {
        if (!browser) return;
        isDocumentVisible = document.visibilityState === "visible";

        function updateDocumentVisibility() {
            isDocumentVisible = document.visibilityState === "visible";
        }

        document.addEventListener("visibilitychange", updateDocumentVisibility);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                updateDocumentVisibility,
            );
        };
    });

    $effect(() => {
        if (!browser) return;
        if (!root) {
            isInViewport = false;
            return;
        }

        if (!("IntersectionObserver" in window)) {
            isInViewport = true;
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                isInViewport = !!entry?.isIntersecting;
            },
            { rootMargin: "80px" },
        );

        observer.observe(root);

        return () => observer.disconnect();
    });

    $effect(() => {
        clearTimer();

        if (shouldTick) {
            updatePosition();
            timer = setInterval(updatePosition, 1000);
        } else {
            currentPosition = positionBase;
        }

        return clearTimer;
    });

    /** @param {number} seconds */
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    // Theme calculations
    let trackBg = $derived(
        theme === "dark" ? "bg-white/20" : "bg-m3-surface-variant",
    );
    let progressBg = $derived.by(() => {
        if (theme === "dark") return "bg-white";
        if (color) return ""; // Handled inline
        return "bg-m3-primary";
    });

    let progressStyle = $derived.by(() => {
        if (theme !== "dark" && color) return `background-color: ${color};`;
        return "";
    });
    let textColor = $derived(
        theme === "dark"
            ? "text-white/60"
            : "text-m3-on-surface-variant opacity-80",
    );
</script>

{#if duration > 0}
    <div
        bind:this={root}
        class="flex flex-col gap-[clamp(0.25rem,1.4cqmin,0.5rem)] w-full"
    >
        <div class={`w-full h-[clamp(0.1875rem,1cqmin,0.375rem)] ${trackBg} rounded-full overflow-hidden`}>
            <div
                class={`h-full ${progressBg} transition-all duration-300 ease-linear`}
                style={`width: ${(currentPosition / duration) * 100}%; ${progressStyle}`}
            ></div>
        </div>
        <div
            class={`flex justify-between text-[clamp(0.625rem,2.8cqmin,0.875rem)] font-medium leading-none tabular-nums ${textColor}`}
        >
            <span>{formatTime(currentPosition)}</span>
            <span>{formatTime(duration)}</span>
        </div>
    </div>
{/if}
