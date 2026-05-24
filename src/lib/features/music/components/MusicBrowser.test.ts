import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MusicBrowser from './MusicBrowser.svelte';

const { searchMock, searchRadioStationsMock, getRadioBrowserCountryStationsMock } = vi.hoisted(() => ({
    searchMock: vi.fn(),
    searchRadioStationsMock: vi.fn(),
    getRadioBrowserCountryStationsMock: vi.fn()
}));

vi.mock('../stores/maStore.svelte', () => ({
    maStore: {
        search: searchMock,
        searchRadioStations: searchRadioStationsMock,
        getRadioBrowserCountryStations: getRadioBrowserCountryStationsMock,
        getArtists: vi.fn(),
        getAlbums: vi.fn(),
        getPlaylists: vi.fn(),
        getTracks: vi.fn()
    }
}));

vi.mock('../stores/musicLibrary.svelte', () => ({
    musicLibraryStore: {
        favorites: [],
        loading: false,
        syncing: false,
        syncError: null,
        isFavorite: vi.fn().mockReturnValue(false),
        toggleFavorite: vi.fn(),
        syncFromMA: vi.fn()
    }
}));

vi.mock('$lib/stores/theme.svelte', () => ({
    themeStore: {
        t: (key: string) => ({
            'music.sections.playlists': 'Playlists',
            'music.sections.artists': 'Artists',
            'music.sections.albums': 'Albums',
            'music.sections.podcasts': 'Podcasts',
            'music.sections.tracks': 'Tracks',
            'music.tabs.radio': 'Radio',
            'music.radio.favorites': 'Favorite radio',
            'music.radio.browseByCountry': 'Radio by country',
            'music.radio.countryHint': 'Play or favorite stations from {country}.',
            'music.radio.countrySelector': 'Choose a radio country',
            'music.radio.loadingCountry': 'Loading radio stations',
            'music.radio.noCountryResults': 'No stations found for this country',
            'music.radio.filterPlaceholder': 'Search stations',
            'music.radio.resultsCount': '{count} stations',
            'music.play': 'Play',
            'music.artist': 'Artist',
            'music.playlist': 'Playlist',
            'music.podcast': 'Podcast',
            'music.addFavorite': 'Add favorite',
            'music.removeFavorite': 'Remove favorite'
        }[key] || key),
        language: 'en'
    }
}));

describe('MusicBrowser search', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        searchMock.mockResolvedValue({
            ok: true,
            value: {
                playlists: [{ uri: 'mass://playlist/1', item_id: '1', name: 'Dinner playlist', media_type: 'playlist', provider: 'spotify' }],
                artists: [{ uri: 'mass://artist/1', item_id: '2', name: 'Dinner Artist', media_type: 'artist', provider: 'spotify' }],
                albums: [{ uri: 'mass://album/1', item_id: '3', name: 'Dinner Album', media_type: 'album', provider: 'spotify' }],
                podcasts: [{ uri: 'mass://podcast/1', item_id: '4', name: 'Dinner Podcast', media_type: 'podcast', provider: 'spotify' }],
                tracks: [{ uri: 'mass://track/1', item_id: '5', name: 'Dinner Song', media_type: 'track', provider: 'spotify', artists: [], duration: 180 }],
                radio: [{ uri: 'mass://radio/1', item_id: '6', name: 'Dinner Radio', media_type: 'radio', provider: 'tunein' }]
            }
        });
        searchRadioStationsMock.mockResolvedValue({
            ok: true,
            value: [
                { uri: 'mass://radio/npo2', item_id: 'npo2', name: 'NPO Radio 2', media_type: 'radio', provider: 'tunein' }
            ]
        });
        getRadioBrowserCountryStationsMock.mockResolvedValue({
            ok: true,
            value: [
                {
                    uri: 'media-source://radio_browser/npo2',
                    item_id: 'npo2',
                    name: 'NPO Radio 2',
                    media_type: 'radio',
                    provider: 'radio_browser',
                    countryCode: 'NL'
                },
                {
                    uri: 'media-source://radio_browser/radio538',
                    item_id: 'radio538',
                    name: 'Radio 538',
                    media_type: 'radio',
                    provider: 'radio_browser',
                    countryCode: 'NL'
                }
            ]
        });
    });

    it('orders search result sections by household discovery priority', async () => {
        const { container } = render(MusicBrowser, {
            props: {
                section: 'search',
                searchQuery: 'dinner',
                onPlay: vi.fn()
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Dinner playlist')).toBeInTheDocument();
        });

        const headings = Array.from(container.querySelectorAll('h3')).map((heading) => heading.textContent?.trim());
        expect(headings).toEqual(['Playlists', 'Artists', 'Albums', 'Podcasts', 'Tracks', 'Radio']);
        expect(searchMock).toHaveBeenCalledWith('dinner', 20);
    });

    it('lets the radio tab discover playable stations by country', async () => {
        render(MusicBrowser, {
            props: {
                section: 'radio',
                onPlay: vi.fn()
            }
        });

        await waitFor(() => {
            expect(screen.getByText('NPO Radio 2')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /netherlands/i })).toHaveAttribute('aria-pressed', 'true');
        expect(getRadioBrowserCountryStationsMock).toHaveBeenCalledWith('NL', 1000);
        expect(searchRadioStationsMock).not.toHaveBeenCalled();
    });

    it('filters the country radio list by station name', async () => {
        render(MusicBrowser, {
            props: {
                section: 'radio',
                onPlay: vi.fn()
            }
        });

        await waitFor(() => {
            expect(screen.getByText('NPO Radio 2')).toBeInTheDocument();
            expect(screen.getByText('Radio 538')).toBeInTheDocument();
        });

        await fireEvent.input(screen.getByPlaceholderText('Search stations'), {
            target: { value: '538' }
        });

        expect(screen.queryByText('NPO Radio 2')).not.toBeInTheDocument();
        expect(screen.getByText('Radio 538')).toBeInTheDocument();
    });

    it('falls back to Music Assistant country search when Radio Browser is unavailable', async () => {
        getRadioBrowserCountryStationsMock.mockResolvedValueOnce({
            ok: false,
            error: new Error('Unknown media source')
        });

        render(MusicBrowser, {
            props: {
                section: 'radio',
                onPlay: vi.fn()
            }
        });

        await waitFor(() => {
            expect(screen.getByText('NPO Radio 2')).toBeInTheDocument();
        });

        expect(searchRadioStationsMock).toHaveBeenCalledWith(
            expect.arrayContaining(['NPO radio Netherlands', 'Radio 538', 'Omroep Brabant radio']),
            1000,
            expect.objectContaining({
                stationAliases: expect.arrayContaining([
                    expect.objectContaining({ key: 'NPO Radio 1' }),
                    expect.objectContaining({ key: 'Radio 538' }),
                    expect.objectContaining({ key: 'Omroep Brabant' })
                ]),
                rejectedNamePhrases: expect.arrayContaining(['BBC', 'Belgium', 'France'])
            })
        );
    });

    it('uses a fresh cached country radio catalog without querying Music Assistant', async () => {
        localStorage.setItem(
            'music.radio.country.NL.v6',
            JSON.stringify({
                version: 6,
                updatedAt: Date.now(),
                items: [
                    { uri: 'mass://radio/cached', item_id: 'cached', name: 'Cached Dutch Radio', media_type: 'radio', provider: 'tunein' }
                ]
            })
        );

        render(MusicBrowser, {
            props: {
                section: 'radio',
                onPlay: vi.fn()
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Cached Dutch Radio')).toBeInTheDocument();
        });

        expect(getRadioBrowserCountryStationsMock).not.toHaveBeenCalled();
        expect(searchRadioStationsMock).not.toHaveBeenCalled();
    });
});
