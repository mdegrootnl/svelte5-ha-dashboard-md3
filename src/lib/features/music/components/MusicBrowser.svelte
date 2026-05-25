<!--
  MusicBrowser.svelte
  Grid browser for library content (Spotify-style)
  
  Features:
  - Responsive grid (2-6 columns)
  - Card items with artwork, title, subtitle
  - Different sections: home, browse, radio, library, search
-->
<script lang="ts">
    import { browser } from "$app/environment";
    import { maStore } from "../stores/maStore.svelte";
    import { musicLibraryStore } from "../stores/musicLibrary.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import AuthenticatedImage from "$lib/components/common/AuthenticatedImage.svelte";
    import type {
        MAMediaItem,
        MAArtist,
        MAAlbum,
        MATrack,
        MARadio,
        MAPlaylist,
        MAPodcast,
    } from "$lib/types/musicAssistant";

    import MusicNote from "~icons/material-symbols/music-note";
    import Radio from "~icons/material-symbols/radio";
    import Sync from "~icons/material-symbols/sync";
    import Search from "~icons/material-symbols/search";
    import PlayArrow from "~icons/material-symbols/play-arrow";
    import Favorite from "~icons/material-symbols/favorite";
    import FavoriteBorder from "~icons/material-symbols/favorite-outline";

    import MusicSection from "./MusicSection.svelte";
    import MusicCard from "./MusicCard.svelte";

    interface Props {
        section: "home" | "browse" | "radio" | "library" | "search";
        searchQuery?: string;
        onPlay: (item: MAMediaItem) => void;
    }

    let { section, searchQuery = "", onPlay }: Props = $props();

    const RADIO_COUNTRY_CACHE_VERSION = 6;
    const RADIO_COUNTRY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
    const RADIO_COUNTRY_RESULT_LIMIT = 1000;

    const RADIO_COUNTRIES = [
        {
            code: "NL",
            flag: "NL",
            queries: [
                "NPO radio Netherlands",
                "NPO Radio 1",
                "NPO Radio 2",
                "NPO 3FM",
                "NPO Klassiek",
                "NPO Radio 5",
                "NPO FunX",
                "NPO Soul Jazz",
                "NPO Sterren NL",
                "Radio 538",
                "Qmusic Netherlands",
                "Sky Radio",
                "Radio 10",
                "Radio Veronica",
                "SLAM",
                "100% NL",
                "BNR Nieuwsradio",
                "KINK",
                "Sublime",
                "Arrow Classic Rock",
                "Classicnl",
                "JOE Nederland",
                "Grand Prix Radio",
                "Omroep Brabant radio",
                "Radio Rijnmond",
                "NH Radio",
                "Radio Gelderland",
                "RTV Utrecht radio",
                "Omrop Fryslan radio",
                "Radio Drenthe",
                "Radio Oost",
                "Radio West",
                "Radio Noord",
                "L1 Radio",
                "Omroep Zeeland radio",
                "Radio Flevoland",
            ],
            searchOptions: {
                stationAliases: [
                    { key: "NPO Radio 1", aliases: ["NPO Radio 1"] },
                    { key: "NPO Radio 2", aliases: ["NPO Radio 2"] },
                    { key: "NPO 3FM", aliases: ["NPO 3FM", "3FM"] },
                    { key: "NPO Klassiek", aliases: ["NPO Klassiek", "NPO Radio 4"] },
                    { key: "NPO Radio 5", aliases: ["NPO Radio 5"] },
                    { key: "NPO FunX", aliases: ["NPO FunX", "FunX"] },
                    { key: "NPO Soul & Jazz", aliases: ["NPO Soul Jazz", "NPO Soul & Jazz"] },
                    { key: "NPO Sterren NL", aliases: ["NPO Sterren NL", "Sterren NL"] },
                    { key: "Radio 538", aliases: ["Radio 538", "538"] },
                    { key: "Qmusic", aliases: ["Qmusic", "Q music", "Q-music"] },
                    { key: "Sky Radio", aliases: ["Sky Radio"] },
                    { key: "Radio 10", aliases: ["Radio 10"] },
                    { key: "Radio Veronica", aliases: ["Radio Veronica"] },
                    { key: "SLAM", aliases: ["SLAM"] },
                    { key: "100% NL", aliases: ["100% NL"] },
                    { key: "BNR Nieuwsradio", aliases: ["BNR Nieuwsradio", "BNR"] },
                    { key: "KINK", aliases: ["KINK"] },
                    { key: "Sublime", aliases: ["Sublime"] },
                    { key: "Arrow Classic Rock", aliases: ["Arrow Classic Rock"] },
                    { key: "Classicnl", aliases: ["Classicnl", "Classic NL"] },
                    { key: "JOE Nederland", aliases: ["JOE Nederland"] },
                    { key: "Grand Prix Radio", aliases: ["Grand Prix Radio"] },
                    { key: "Omroep Brabant", aliases: ["Omroep Brabant"] },
                    { key: "Radio Rijnmond", aliases: ["Radio Rijnmond", "Rijnmond"] },
                    { key: "NH Radio", aliases: ["NH Radio"] },
                    { key: "Radio Gelderland", aliases: ["Radio Gelderland"] },
                    { key: "RTV Utrecht", aliases: ["RTV Utrecht"] },
                    { key: "Omrop Fryslan", aliases: ["Omrop Fryslan"] },
                    { key: "Radio Drenthe", aliases: ["Radio Drenthe"] },
                    { key: "Radio Oost", aliases: ["Radio Oost"] },
                    { key: "Radio West", aliases: ["Radio West"] },
                    { key: "Radio Noord", aliases: ["Radio Noord"] },
                    { key: "L1 Radio", aliases: ["L1 Radio"] },
                    { key: "Omroep Zeeland", aliases: ["Omroep Zeeland"] },
                    { key: "Radio Flevoland", aliases: ["Radio Flevoland"] },
                ],
                rejectedNamePhrases: [
                    "BBC",
                    "Belgium",
                    "Belgie",
                    "Belgique",
                    "Vlaanderen",
                    "France",
                    "Deutschland",
                    "Germany",
                    "United Kingdom",
                    "USA",
                    "Canada",
                    "Australia",
                    "Ireland",
                ],
            },
        },
        { code: "BE", flag: "BE", queries: ["Belgium", "VRT radio"] },
        { code: "DE", flag: "DE", queries: ["Deutschland", "Germany", "German radio"] },
        { code: "FR", flag: "FR", queries: ["France", "French radio"] },
        { code: "ES", flag: "ES", queries: ["Spain", "Spanish radio"] },
        { code: "GB", flag: "UK", queries: ["United Kingdom", "BBC radio", "UK radio"] },
        { code: "US", flag: "US", queries: ["United States", "USA radio", "American radio"] },
        { code: "IT", flag: "IT", queries: ["Italia", "Italy", "Italian radio"] },
        { code: "PT", flag: "PT", queries: ["Portugal", "Portuguese radio"] },
    ];

    // ========================================================================
    // Local Library - Derived filters by media type
    // ========================================================================

    const localPlaylists = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "playlist",
        ) as MAPlaylist[],
    );
    const localAlbums = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "album",
        ) as MAAlbum[],
    );
    const localTracks = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "track",
        ) as MATrack[],
    );
    const localRadios = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "radio",
        ) as MARadio[],
    );
    const localArtists = $derived(
        musicLibraryStore.favorites.filter(
            (f) => f.media_type === "artist",
        ) as MAArtist[],
    );

    // ========================================================================
    // Content state (for browse/search from MA)
    // ========================================================================

    let browseArtists = $state<MAArtist[]>([]);
    let browseAlbums = $state<MAAlbum[]>([]);
    let browsePlaylists = $state<MAPlaylist[]>([]);
    let browseTracks = $state<MATrack[]>([]);
    let loading = $state(false);
    let selectedRadioCountryCode = $state("NL");
    let countryRadioStations = $state<MARadio[]>([]);
    let countryRadioLoading = $state(false);
    let countryRadioError = $state<string | null>(null);
    let radioNameFilter = $state("");
    let countryRadioRequestId = 0;

    const selectedRadioCountry = $derived(
        RADIO_COUNTRIES.find((country) => country.code === selectedRadioCountryCode) ?? RADIO_COUNTRIES[0],
    );
    const localRadioUris = $derived(
        new Set(localRadios.map((item) => item.uri || item.item_id)),
    );
    const visibleCountryRadioStations = $derived(
        countryRadioStations.filter((item) => {
            if (localRadioUris.has(item.uri || item.item_id)) return false;

            const filter = radioNameFilter.trim().toLocaleLowerCase();
            if (!filter) return true;

            return item.name.toLocaleLowerCase().includes(filter);
        }),
    );

    // Search results
    let searchResults = $state<{
        artists: MAArtist[];
        albums: MAAlbum[];
        tracks: MATrack[];
        playlists: MAPlaylist[];
        podcasts: MAPodcast[];
        radio: MARadio[];
    } | null>(null);

    // Load content based on section (only browse needs MA fetch)
    async function loadContent() {
        if (section === "browse") {
            loading = true;
            try {
                const [artistsRes, albumsRes, playlistsRes, tracksRes] =
                    await Promise.all([
                        maStore.getArtists(20),
                        maStore.getAlbums(20),
                        maStore.getPlaylists(20),
                        maStore.getTracks(20),
                    ]);

                if (artistsRes.ok) browseArtists = artistsRes.value;
                if (albumsRes.ok) browseAlbums = albumsRes.value;
                if (playlistsRes.ok) browsePlaylists = playlistsRes.value;
                if (tracksRes.ok) browseTracks = tracksRes.value;
            } finally {
                loading = false;
            }
        }
    }

    // Handle search queries
    async function performSearch(query: string) {
        if (!query.trim()) {
            searchResults = null;
            return;
        }
        loading = true;
        try {
            const result = await maStore.search(query, 20);
            if (result.ok) {
                searchResults = result.value;
            } else {
                console.error("Search failed:", result.error);
                searchResults = null;
            }
        } finally {
            loading = false;
        }
    }

    function getCountryLabel(country: (typeof RADIO_COUNTRIES)[number]) {
        try {
            return new Intl.DisplayNames([themeStore.language], { type: "region" }).of(country.code) ?? country.code;
        } catch {
            return country.code;
        }
    }

    function getRadioCountryCacheKey(countryCode: string) {
        return `music.radio.country.${countryCode}.v${RADIO_COUNTRY_CACHE_VERSION}`;
    }

    function readCachedCountryRadio(countryCode: string) {
        if (!browser) return null;

        try {
            const raw = localStorage.getItem(getRadioCountryCacheKey(countryCode));
            if (!raw) return null;

            const cached = JSON.parse(raw) as {
                version?: number;
                updatedAt?: number;
                items?: MARadio[];
            };

            if (
                cached.version !== RADIO_COUNTRY_CACHE_VERSION ||
                typeof cached.updatedAt !== "number" ||
                !Array.isArray(cached.items)
            ) {
                return null;
            }

            return {
                updatedAt: cached.updatedAt,
                items: cached.items,
                isFresh: Date.now() - cached.updatedAt < RADIO_COUNTRY_CACHE_TTL_MS,
            };
        } catch {
            return null;
        }
    }

    function writeCachedCountryRadio(countryCode: string, items: MARadio[]) {
        if (!browser) return;

        try {
            localStorage.setItem(
                getRadioCountryCacheKey(countryCode),
                JSON.stringify({
                    version: RADIO_COUNTRY_CACHE_VERSION,
                    updatedAt: Date.now(),
                    items,
                }),
            );
        } catch {
            // Cache failures should never block playback or discovery.
        }
    }

    async function loadCountryRadioStations() {
        const requestId = ++countryRadioRequestId;
        const country = selectedRadioCountry;
        const cached = readCachedCountryRadio(country.code);

        if (cached) {
            countryRadioStations = cached.items;
        }

        if (cached?.isFresh) {
            countryRadioLoading = false;
            countryRadioError = null;
            return;
        }

        countryRadioLoading = !cached;
        countryRadioError = null;

        try {
            let result = await maStore.getRadioBrowserCountryStations(country.code, RADIO_COUNTRY_RESULT_LIMIT);
            if (!result.ok) {
                result = await maStore.searchRadioStations(
                    country.queries,
                    RADIO_COUNTRY_RESULT_LIMIT,
                    country.searchOptions,
                );
            }
            if (requestId !== countryRadioRequestId) return;

            if (result.ok) {
                countryRadioStations = result.value;
                writeCachedCountryRadio(country.code, result.value);
            } else {
                if (!cached) {
                    countryRadioStations = [];
                    countryRadioError = result.error.message;
                }
            }
        } finally {
            if (requestId === countryRadioRequestId) countryRadioLoading = false;
        }
    }

    // Reload when section changes
    $effect(() => {
        if (section && section !== "search") {
            loadContent();
        }
    });

    // Perform search when query changes
    $effect(() => {
        if (section === "search" && searchQuery) {
            performSearch(searchQuery);
        }
    });

    $effect(() => {
        if (section === "radio") {
            loadCountryRadioStations();
        }
    });
</script>

<div class="py-4">
    {#if loading}
        <!-- Loading State -->
        <div class="flex items-center justify-center py-12">
            <div
                class="w-8 h-8 border-2 border-m3-primary border-t-transparent rounded-full animate-spin"
            ></div>
        </div>
    {:else if section === "home"}
        <!-- Home Section -->
        <MusicSection title={themeStore.t("music.sections.playlists")} items={localPlaylists} {onPlay} />
        <MusicSection title={themeStore.t("music.sections.favoriteAlbums")} items={localAlbums} {onPlay} />

        {#if localPlaylists.length === 0 && localAlbums.length === 0}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("music.empty.noFavorites")}
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    {themeStore.t("music.empty.favoriteHint")}
                </p>
            </div>
        {/if}
    {:else if section === "browse"}
        <!-- Browse Section -->
        <MusicSection title={themeStore.t("music.sections.artists")} items={browseArtists} {onPlay} rounded />
        <MusicSection title={themeStore.t("music.sections.albums")} items={browseAlbums} {onPlay} />
        <MusicSection title={themeStore.t("music.sections.playlists")} items={browsePlaylists} {onPlay} />
        <MusicSection title={themeStore.t("music.sections.tracks")} items={browseTracks} {onPlay} />
    {:else if section === "radio"}
        <!-- Radio Section -->
        <div class="space-y-8">
            {#if localRadios.length > 0}
                <MusicSection title={themeStore.t("music.radio.favorites")} items={localRadios} {onPlay} />
            {/if}

            <section class="space-y-4">
                <div class="flex flex-col gap-1">
                    <h3 class="text-m3-title-medium font-bold text-m3-on-surface">
                        {themeStore.t("music.radio.browseByCountry")}
                    </h3>
                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                        {themeStore.t("music.radio.countryHint", {
                            country: getCountryLabel(selectedRadioCountry),
                        })}
                    </p>
                </div>

                <div
                    class="flex gap-2 overflow-x-auto pb-1"
                    role="group"
                    aria-label={themeStore.t("music.radio.countrySelector")}
                >
                    {#each RADIO_COUNTRIES as country}
                        <button
                            class="touch-target inline-flex items-center gap-2 rounded-full border px-4 text-m3-label-large font-medium whitespace-nowrap transition-colors
                                {selectedRadioCountryCode === country.code
                                ? 'border-m3-primary bg-m3-primary text-m3-on-primary'
                                : 'border-m3-outline-variant bg-m3-surface-container text-m3-on-surface hover:bg-m3-surface-container-high'}"
                            aria-pressed={selectedRadioCountryCode === country.code}
                            onclick={() => (selectedRadioCountryCode = country.code)}
                        >
                            <span aria-hidden="true">{country.flag}</span>
                            <span>{getCountryLabel(country)}</span>
                        </button>
                    {/each}
                </div>

                <label
                    class="flex min-h-14 items-center gap-3 rounded-lg bg-m3-surface-container-high px-4 text-m3-on-surface-variant"
                >
                    <Search class="w-5 h-5 shrink-0" />
                    <input
                        class="min-w-0 flex-1 bg-transparent text-m3-body-large text-m3-on-surface outline-none placeholder:text-m3-on-surface-variant"
                        type="search"
                        bind:value={radioNameFilter}
                        placeholder={themeStore.t("music.radio.filterPlaceholder")}
                        aria-label={themeStore.t("music.radio.filterPlaceholder")}
                    />
                </label>

                {#if countryRadioError}
                    <div
                        class="rounded-lg border border-m3-error/40 bg-m3-error-container px-4 py-3 text-m3-body-medium text-m3-on-error-container"
                    >
                        {countryRadioError}
                    </div>
                {:else if countryRadioLoading}
                    <div class="flex items-center justify-center py-8">
                        <div
                            class="w-8 h-8 border-2 border-m3-primary border-t-transparent rounded-full animate-spin"
                            aria-label={themeStore.t("music.radio.loadingCountry")}
                        ></div>
                    </div>
                {:else if visibleCountryRadioStations.length > 0}
                    <div class="flex items-center justify-between gap-3">
                        <p class="text-m3-body-small text-m3-on-surface-variant">
                            {themeStore.t("music.radio.resultsCount", {
                                count: visibleCountryRadioStations.length,
                            })}
                        </p>
                    </div>
                    <div class="grid gap-2">
                        {#each visibleCountryRadioStations as item (item.uri || item.item_id)}
                            {@const isFavorite = musicLibraryStore.isFavorite(item.uri)}
                            <div
                                class="flex items-center gap-3 rounded-lg bg-m3-surface-container px-2 py-2 transition-colors hover:bg-m3-surface-container-high"
                            >
                                <button
                                    class="touch-target grid shrink-0 place-items-center rounded-full bg-m3-primary text-m3-on-primary"
                                    aria-label={themeStore.t("music.play")}
                                    onclick={() => onPlay(item)}
                                >
                                    <PlayArrow class="w-6 h-6" />
                                </button>
                                <button
                                    class="min-w-0 flex flex-1 items-center gap-3 py-1 text-left"
                                    aria-label={`${themeStore.t("music.play")} ${item.name}`}
                                    onclick={() => onPlay(item)}
                                >
                                    <div
                                        class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-m3-surface-container-highest"
                                    >
                                        {#if item.image_url}
                                            <AuthenticatedImage
                                                src={item.image_url}
                                                alt={item.name}
                                                class="h-full w-full object-cover"
                                            />
                                        {:else}
                                            <Radio class="w-6 h-6 text-m3-on-surface-variant opacity-50" />
                                        {/if}
                                    </div>
                                    <div class="min-w-0">
                                        <p class="truncate text-m3-body-large font-medium text-m3-on-surface">
                                            {item.name}
                                        </p>
                                        <p class="truncate text-m3-body-small text-m3-on-surface-variant">
                                            {item.provider === "radio_browser"
                                                ? getCountryLabel(selectedRadioCountry)
                                                : item.provider || "Radio"}
                                        </p>
                                    </div>
                                </button>
                                <button
                                    class="touch-target grid shrink-0 place-items-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-primary"
                                    aria-label={isFavorite ? themeStore.t("music.removeFavorite") : themeStore.t("music.addFavorite")}
                                    onclick={() => musicLibraryStore.toggleFavorite(item)}
                                >
                                    {#if isFavorite}
                                        <Favorite class="w-5 h-5 text-m3-primary" />
                                    {:else}
                                        <FavoriteBorder class="w-5 h-5" />
                                    {/if}
                                </button>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <div
                        class="flex flex-col items-center justify-center py-12 text-center"
                    >
                        <Radio
                            class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                        />
                        <p class="text-m3-body-large text-m3-on-surface-variant">
                            {themeStore.t("music.radio.noCountryResults")}
                        </p>
                    </div>
                {/if}
            </section>

            {#if localRadios.length === 0 && !countryRadioLoading && visibleCountryRadioStations.length === 0 && !countryRadioError}
                <div
                    class="flex flex-col items-center justify-center py-4 text-center"
                >
                    <p
                        class="text-m3-body-medium text-m3-on-surface-variant opacity-70"
                    >
                        {themeStore.t("music.empty.favoriteHint")}
                    </p>
                </div>
            {/if}
        </div>
    {:else if section === "library"}
        <!-- Library Section -->
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-m3-title-large font-bold text-m3-on-surface">
                {themeStore.t("music.tabs.library")}
            </h2>
            <button
                class="flex items-center gap-2 px-4 py-2 rounded-full bg-m3-surface-container-high text-m3-on-surface hover:bg-m3-surface-container-highest transition-colors disabled:opacity-50"
                onclick={() => musicLibraryStore.syncFromMA(maStore)}
                disabled={musicLibraryStore.loading || musicLibraryStore.syncing}
            >
                <Sync
                    class="w-5 h-5 {musicLibraryStore.loading || musicLibraryStore.syncing
                        ? 'animate-spin'
                        : ''}"
                />
                <span class="text-m3-label-large">
                    {musicLibraryStore.loading || musicLibraryStore.syncing
                        ? themeStore.t("music.library.syncing")
                        : themeStore.t("music.library.sync")}
                </span>
            </button>
        </div>

        {#if musicLibraryStore.syncError}
            <div
                class="mb-6 rounded-lg border border-m3-error/40 bg-m3-error-container px-4 py-3 text-m3-body-medium text-m3-on-error-container"
            >
                {musicLibraryStore.syncError}
            </div>
        {/if}

        <MusicSection title={themeStore.t("music.sections.favoriteTracks")} items={localTracks} {onPlay} />
        <MusicSection title={themeStore.t("music.sections.favoriteAlbums")} items={localAlbums} {onPlay} />
        <MusicSection
            title={themeStore.t("music.sections.favoriteArtists")}
            items={localArtists}
            {onPlay}
            rounded
        />
        <MusicSection title={themeStore.t("music.sections.playlists")} items={localPlaylists} {onPlay} />
        <MusicSection title={themeStore.t("music.sections.radioStations")} items={localRadios} {onPlay} />

        {#if localTracks.length === 0 && localAlbums.length === 0 && localArtists.length === 0 && localPlaylists.length === 0 && localRadios.length === 0}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("music.empty.library")}
                </p>
                <p
                    class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                >
                    {themeStore.t("music.empty.favoriteHint")}
                </p>
            </div>
        {/if}
    {:else if section === "search"}
        <!-- Search Section -->
        {#if searchResults}
            <MusicSection
                title={themeStore.t("music.sections.playlists")}
                items={searchResults.playlists}
                {onPlay}
            />
            <MusicSection
                title={themeStore.t("music.sections.artists")}
                items={searchResults.artists}
                {onPlay}
                rounded
            />
            <MusicSection
                title={themeStore.t("music.sections.albums")}
                items={searchResults.albums}
                {onPlay}
            />
            <MusicSection
                title={themeStore.t("music.sections.podcasts")}
                items={searchResults.podcasts}
                {onPlay}
            />
            <MusicSection
                title={themeStore.t("music.sections.tracks")}
                items={searchResults.tracks}
                {onPlay}
            />
            <MusicSection title={themeStore.t("music.tabs.radio")} items={searchResults.radio} {onPlay} />

            {#if searchResults.playlists.length === 0 && searchResults.artists.length === 0 && searchResults.albums.length === 0 && searchResults.podcasts.length === 0 && searchResults.tracks.length === 0 && searchResults.radio.length === 0}
                <div
                    class="flex flex-col items-center justify-center py-12 text-center"
                >
                    <MusicNote
                        class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                    />
                    <p class="text-m3-body-large text-m3-on-surface-variant">
                        {themeStore.t("music.empty.noResults")}
                    </p>
                    <p
                        class="text-m3-body-medium text-m3-on-surface-variant opacity-70 mt-1"
                    >
                        {themeStore.t("music.empty.tryDifferentSearch")}
                    </p>
                </div>
            {/if}
        {:else if searchQuery}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("music.empty.startTyping")}
                </p>
            </div>
        {:else}
            <div
                class="flex flex-col items-center justify-center py-12 text-center"
            >
                <MusicNote
                    class="w-16 h-16 text-m3-on-surface-variant opacity-30 mb-4"
                />
                <p class="text-m3-body-large text-m3-on-surface-variant">
                    {themeStore.t("music.empty.searchPrompt")}
                </p>
            </div>
        {/if}
    {/if}
</div>
