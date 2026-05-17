<script lang="ts">
    import { browser } from "$app/environment";
    import Button from "$lib/components/md3/Button.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import type { DashboardImageAttribution } from "$lib/types/dashboard";
    import { extractAccentColorFromImageUrl } from "$lib/utils/imageAccent";
    import Upload from "~icons/material-symbols/upload";
    import Image from "~icons/material-symbols/image";
    import Delete from "~icons/material-symbols/delete";
    import Search from "~icons/material-symbols/search";

    interface ProviderImageResult {
        id: string;
        thumbUrl: string;
        imageUrl: string;
        description: string;
        color?: string;
        attribution: DashboardImageAttribution;
    }

    let {
        value = $bindable(),
        attribution = $bindable<DashboardImageAttribution | undefined>(),
        label = "Image",
        orientation = "landscape",
        enableUnsplash = false,
        enablePexels = false,
        accentColor = $bindable<string | undefined>(),
        searchHint = "",
        onchange = undefined,
    } = $props();

    let fileInput: HTMLInputElement;

    let uploading = $state(false);
    let errorMessage = $state("");
    let unsplashQuery = $state("");
    let unsplashResults = $state<ProviderImageResult[]>([]);
    let searchingUnsplash = $state(false);
    let unsplashMessage = $state("");
    let pexelsQuery = $state("");
    let pexelsResults = $state<ProviderImageResult[]>([]);
    let searchingPexels = $state(false);
    let pexelsMessage = $state("");
    let attributionImageUrl = $state(value || "");
    let lastExtractedValue = $state("");
    let accentExtractionTimer: ReturnType<typeof setTimeout> | undefined;

    $effect(() => {
        if (!unsplashQuery && searchHint) {
            unsplashQuery = searchHint;
        }
        if (!pexelsQuery && searchHint) {
            pexelsQuery = searchHint;
        }
    });

    $effect(() => {
        if (attribution && value && !attributionImageUrl) {
            attributionImageUrl = value;
        }
        if (attribution && attributionImageUrl && value !== attributionImageUrl) {
            attribution = undefined;
            attributionImageUrl = "";
        }
    });

    $effect(() => {
        if (!browser || !value || attribution?.provider === "unsplash" || attribution?.provider === "pexels") {
            return;
        }
        if (value === lastExtractedValue) return;

        if (accentExtractionTimer) clearTimeout(accentExtractionTimer);
        accentExtractionTimer = setTimeout(() => {
            extractAccentFromImage(value);
        }, 600);

        return () => {
            if (accentExtractionTimer) clearTimeout(accentExtractionTimer);
        };
    });

    async function extractAccentFromImage(url: string) {
        if (!browser || !url || url === lastExtractedValue) return;
        lastExtractedValue = url;

        const extractedAccent = await extractAccentColorFromImageUrl(url);
        if (extractedAccent) {
            accentColor = extractedAccent;
        }
    }

    async function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            const file = target.files[0];
            uploading = true;
            errorMessage = "";

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: file,
                    headers: {
                        "x-filename": encodeURIComponent(file.name),
                        "content-type": file.type,
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    value = data.url;
                    attribution = undefined;
                    attributionImageUrl = "";
                    await extractAccentFromImage(data.url);
                    onchange?.();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    errorMessage =
                        errorData.error ||
                        `Upload failed with status ${res.status}`;
                    console.error("Upload failed:", errorMessage);
                }
            } catch (err) {
                errorMessage = "Network error or server unavailable";
                console.error("Upload error", err);
            } finally {
                uploading = false;
                // Reset input to allow re-uploading the same file
                target.value = "";
            }
        }
    }

    function triggerUpload() {
        fileInput.click();
    }

    function clear() {
        value = "";
        attribution = undefined;
        attributionImageUrl = "";
        accentColor = undefined;
        onchange?.();
    }

    async function searchUnsplash() {
        const query = unsplashQuery.trim() || searchHint.trim();
        if (!query) return;

        searchingUnsplash = true;
        unsplashMessage = "";
        errorMessage = "";

        try {
            const params = new URLSearchParams({
                query,
                orientation: orientation === "portrait" ? "portrait" : "landscape",
            });
            const res = await fetch(`/api/image-providers/unsplash/search?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                unsplashResults = [];
                unsplashMessage =
                    data.error || `Unsplash search failed with status ${res.status}`;
                return;
            }

            unsplashResults = data.results || [];
            unsplashMessage =
                unsplashResults.length === 0 ? "No Unsplash images found." : "";
        } catch (err) {
            unsplashResults = [];
            unsplashMessage = "Unsplash search is unavailable.";
            console.error("Unsplash search error", err);
        } finally {
            searchingUnsplash = false;
        }
    }

    async function searchPexels() {
        const query = pexelsQuery.trim() || searchHint.trim();
        if (!query) return;

        searchingPexels = true;
        pexelsMessage = "";
        errorMessage = "";

        try {
            const params = new URLSearchParams({
                query,
                orientation: orientation === "portrait" ? "portrait" : "landscape",
            });
            const res = await fetch(`/api/image-providers/pexels/search?${params.toString()}`);
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                pexelsResults = [];
                pexelsMessage =
                    data.error || `Pexels search failed with status ${res.status}`;
                return;
            }

            pexelsResults = data.results || [];
            pexelsMessage =
                pexelsResults.length === 0 ? "No Pexels images found." : "";
        } catch (err) {
            pexelsResults = [];
            pexelsMessage = "Pexels search is unavailable.";
            console.error("Pexels search error", err);
        } finally {
            searchingPexels = false;
        }
    }

    async function selectUnsplashImage(result: ProviderImageResult) {
        value = result.imageUrl;
        attribution = result.attribution;
        attributionImageUrl = result.imageUrl;
        accentColor = result.color || undefined;
        onchange?.();

        const downloadLocation = result.attribution.downloadLocation;
        if (!downloadLocation) return;

        try {
            await fetch("/api/image-providers/unsplash/download", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ downloadLocation }),
            });
        } catch (err) {
            console.warn("Unsplash download tracking failed", err);
        }
    }

    function selectPexelsImage(result: ProviderImageResult) {
        value = result.imageUrl;
        attribution = result.attribution;
        attributionImageUrl = result.imageUrl;
        accentColor = result.color || undefined;
        onchange?.();
    }
</script>

<div class="flex flex-col gap-2">
    <span class="text-m3-label-large text-m3-on-surface">{label}</span>

    <div class="flex items-start gap-4">
        <!-- Preview -->
        <div
            class="relative group bg-m3-surface-container-high border border-m3-outline-variant rounded-lg overflow-hidden flex-shrink-0
            {orientation === 'landscape'
                ? 'w-48 h-28'
                : 'w-28 h-48'} flex items-center justify-center"
        >
            {#if value}
                <img
                    src={value}
                    alt="Preview"
                    class="w-full h-full object-cover"
                />
                <button
                    onclick={clear}
                    class="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                >
                    <Delete class="w-5 h-5" />
                </button>
            {:else}
                <Image class="w-8 h-8 text-m3-on-surface-variant opacity-50" />
            {/if}

            {#if uploading}
                <div
                    class="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                    <div
                        class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"
                    ></div>
                </div>
            {/if}
        </div>

        <!-- Controls -->
        <div class="flex-1 flex flex-col gap-3">
            <TextField label="Image URL" placeholder="https://..." bind:value />

            <div class="flex flex-col gap-2">
                <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    bind:this={fileInput}
                    onchange={handleFile}
                />

                <div class="flex gap-2">
                    <Button
                        variant="tonal"
                        onclick={triggerUpload}
                        icon={Upload}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                </div>

                {#if errorMessage}
                    <p class="text-m3-error text-m3-body-small px-1">
                        {errorMessage}
                    </p>
                {/if}
            </div>
            {#if attribution?.provider === "unsplash"}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Selected Unsplash photo by {attribution.authorName ||
                        "Unknown photographer"}.
                </p>
            {:else if attribution?.provider === "pexels"}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Selected Pexels photo by {attribution.authorName ||
                        "Unknown photographer"}.
                </p>
            {:else}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Upload a local file (saved to local functionality) or paste a
                    URL.
                </p>
            {/if}
        </div>
    </div>

    {#if enableUnsplash}
        <div class="mt-2 flex flex-col gap-3 rounded-m3-md border border-m3-outline-variant/50 bg-m3-surface-container-low p-3">
            <div class="flex items-end gap-2">
                <div class="min-w-0 flex-1">
                    <TextField
                        label="Browse Unsplash"
                        placeholder="kitchen interior, cozy bedroom..."
                        bind:value={unsplashQuery}
                    />
                </div>
                <Button
                    variant="tonal"
                    onclick={searchUnsplash}
                    icon={Search}
                    disabled={searchingUnsplash}
                >
                    {searchingUnsplash ? "Searching..." : "Search"}
                </Button>
            </div>

            {#if unsplashMessage}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {unsplashMessage}
                </p>
            {/if}

            {#if unsplashResults.length > 0}
                <div class="grid grid-cols-2 gap-2">
                    {#each unsplashResults as result (result.id)}
                        <button
                            type="button"
                            class="group relative aspect-video overflow-hidden rounded-m3-sm border border-m3-outline-variant/50 bg-m3-surface-container-high text-left transition-all hover:border-m3-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
                            onclick={() => selectUnsplashImage(result)}
                            aria-label={`Use Unsplash photo by ${result.attribution.authorName || "Unknown photographer"}`}
                        >
                            <img
                                src={result.thumbUrl}
                                alt={result.description || "Unsplash result"}
                                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span
                                class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-m3-label-small text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                                {result.attribution.authorName ||
                                    "Unsplash photographer"}
                            </span>
                        </button>
                    {/each}
                </div>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Unsplash photos keep photographer attribution on the final
                    card.
                </p>
            {/if}
        </div>
    {/if}

    {#if enablePexels}
        <div class="mt-2 flex flex-col gap-3 rounded-m3-md border border-m3-outline-variant/50 bg-m3-surface-container-low p-3">
            <div class="flex items-end gap-2">
                <div class="min-w-0 flex-1">
                    <TextField
                        label="Browse Pexels"
                        placeholder="kitchen interior, cozy bedroom..."
                        bind:value={pexelsQuery}
                    />
                </div>
                <Button
                    variant="tonal"
                    onclick={searchPexels}
                    icon={Search}
                    disabled={searchingPexels}
                >
                    {searchingPexels ? "Searching..." : "Search"}
                </Button>
            </div>

            {#if pexelsMessage}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {pexelsMessage}
                </p>
            {/if}

            {#if pexelsResults.length > 0}
                <div class="grid grid-cols-2 gap-2">
                    {#each pexelsResults as result (result.id)}
                        <button
                            type="button"
                            class="group relative aspect-video overflow-hidden rounded-m3-sm border border-m3-outline-variant/50 bg-m3-surface-container-high text-left transition-all hover:border-m3-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-m3-primary"
                            onclick={() => selectPexelsImage(result)}
                            aria-label={`Use Pexels photo by ${result.attribution.authorName || "Unknown photographer"}`}
                        >
                            <img
                                src={result.thumbUrl}
                                alt={result.description || "Pexels result"}
                                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span
                                class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-m3-label-small text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                                {result.attribution.authorName ||
                                    "Pexels photographer"}
                            </span>
                        </button>
                    {/each}
                </div>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    Pexels photos keep photographer attribution on the final
                    dashboard.
                </p>
            {/if}
        </div>
    {/if}
</div>
