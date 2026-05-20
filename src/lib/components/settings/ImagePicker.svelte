<script lang="ts">
    import { browser } from "$app/environment";
    import Button from "$lib/components/md3/Button.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import type { DashboardImageAttribution } from "$lib/types/dashboard";
    import { extractAccentColorFromImageUrl } from "$lib/utils/imageAccent";
    import { withBase } from "$lib/utils/appBase";
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
        label = "",
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

    function ip(key: string, params: Record<string, string | number> = {}) {
        return themeStore.t(`imagePicker.${key}`, params);
    }

    function photographerName(name?: string | null) {
        return name || ip("unknownPhotographer");
    }

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

        const extractedAccent = await extractAccentColorFromImageUrl(withBase(url));
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
                    await extractAccentFromImage(withBase(value));
                    onchange?.();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    errorMessage =
                        errorData.error ||
                        ip("uploadFailedStatus", { status: res.status });
                    console.error("Upload failed:", errorMessage);
                }
            } catch (err) {
                errorMessage = ip("networkError");
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
                    data.error || ip("unsplashFailedStatus", { status: res.status });
                return;
            }

            unsplashResults = data.results || [];
            unsplashMessage =
                unsplashResults.length === 0 ? ip("noUnsplash") : "";
        } catch (err) {
            unsplashResults = [];
            unsplashMessage = ip("unsplashUnavailable");
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
                    data.error || ip("pexelsFailedStatus", { status: res.status });
                return;
            }

            pexelsResults = data.results || [];
            pexelsMessage =
                pexelsResults.length === 0 ? ip("noPexels") : "";
        } catch (err) {
            pexelsResults = [];
            pexelsMessage = ip("pexelsUnavailable");
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
    <span class="text-m3-label-large text-m3-on-surface">{label || ip("image")}</span>

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
                    src={withBase(value)}
                    alt={ip("preview")}
                    class="w-full h-full object-cover"
                />
                <button
                    onclick={clear}
                    class="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={ip("removeImage")}
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
            <TextField label={ip("imageUrl")} placeholder="https://..." bind:value />

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
                        {uploading ? ip("uploading") : ip("uploadImage")}
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
                    {ip("selectedUnsplash", { author: photographerName(attribution.authorName) })}
                </p>
            {:else if attribution?.provider === "pexels"}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {ip("selectedPexels", { author: photographerName(attribution.authorName) })}
                </p>
            {:else}
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {ip("help")}
                </p>
            {/if}
        </div>
    </div>

    {#if enableUnsplash}
        <div class="mt-2 flex flex-col gap-3 rounded-m3-md border border-m3-outline-variant/50 bg-m3-surface-container-low p-3">
            <div class="flex items-end gap-2">
                <div class="min-w-0 flex-1">
                    <TextField
                        label={ip("browseUnsplash")}
                        placeholder={ip("searchPlaceholder")}
                        bind:value={unsplashQuery}
                    />
                </div>
                <Button
                    variant="tonal"
                    onclick={searchUnsplash}
                    icon={Search}
                    disabled={searchingUnsplash}
                >
                    {searchingUnsplash ? ip("searching") : ip("search")}
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
                            aria-label={ip("useUnsplashPhoto", { author: photographerName(result.attribution.authorName) })}
                        >
                            <img
                                src={result.thumbUrl}
                                alt={result.description || ip("unsplashResult")}
                                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span
                                class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-m3-label-small text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                                {result.attribution.authorName || ip("unsplashPhotographer")}
                            </span>
                        </button>
                    {/each}
                </div>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {ip("unsplashAttributionHelp")}
                </p>
            {/if}
        </div>
    {/if}

    {#if enablePexels}
        <div class="mt-2 flex flex-col gap-3 rounded-m3-md border border-m3-outline-variant/50 bg-m3-surface-container-low p-3">
            <div class="flex items-end gap-2">
                <div class="min-w-0 flex-1">
                    <TextField
                        label={ip("browsePexels")}
                        placeholder={ip("searchPlaceholder")}
                        bind:value={pexelsQuery}
                    />
                </div>
                <Button
                    variant="tonal"
                    onclick={searchPexels}
                    icon={Search}
                    disabled={searchingPexels}
                >
                    {searchingPexels ? ip("searching") : ip("search")}
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
                            aria-label={ip("usePexelsPhoto", { author: photographerName(result.attribution.authorName) })}
                        >
                            <img
                                src={result.thumbUrl}
                                alt={result.description || ip("pexelsResult")}
                                class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span
                                class="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-m3-label-small text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            >
                                {result.attribution.authorName || ip("pexelsPhotographer")}
                            </span>
                        </button>
                    {/each}
                </div>
                <p class="text-m3-body-small text-m3-on-surface-variant">
                    {ip("pexelsAttributionHelp")}
                </p>
            {/if}
        </div>
    {/if}
</div>
