import { afterEach, describe, expect, it, vi } from 'vitest';
import { MusicAssistantStore } from './maStore.svelte';
import { haStore } from '$lib/stores/ha.svelte';
import { ok } from '$lib/utils/result';
import type { MASearchResults } from '$lib/types/musicAssistant';

afterEach(() => {
    haStore.connection = null;
});

function emptySearchResults(overrides: Partial<MASearchResults> = {}): MASearchResults {
    return {
        artists: [],
        albums: [],
        tracks: [],
        playlists: [],
        podcasts: [],
        radio: [],
        ...overrides
    };
}

describe('MusicAssistantStore radio search', () => {
    it('deduplicates country radio results by normalized station name and keeps the richer item', async () => {
        const store = new MusicAssistantStore();
        vi.spyOn(store, 'search')
            .mockResolvedValueOnce(ok(emptySearchResults({
                radio: [
                    { uri: 'tunein://npo-placeholder', item_id: 'placeholder', name: 'NPO Radio %', media_type: 'radio', provider: 'tunein' },
                    { uri: 'mass://radio/npo1-plain', item_id: 'plain', name: 'NPO Radio 1', media_type: 'radio', provider: 'mass' },
                    { uri: 'mass://radio/npo2', item_id: 'npo2', name: 'NPO Radio 2', media_type: 'radio', provider: 'mass' }
                ]
            })))
            .mockResolvedValueOnce(ok(emptySearchResults({
                radio: [
                    { uri: 'tunein://npo1-logo', item_id: 'logo', name: 'NPO Radio 1', media_type: 'radio', provider: 'tunein', image_url: 'logo.png' },
                    { uri: 'tunein://100nl', item_id: '100nl', name: '100% NL', media_type: 'radio', provider: 'tunein' }
                ]
            })));

        const result = await store.searchRadioStations(['NPO', 'NPO Radio 1'], 20);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.map((station) => station.name)).toEqual([
            'NPO Radio 1',
            'NPO Radio 2',
            '100% NL'
        ]);
        expect(result.value.find((station) => station.name === 'NPO Radio 1')?.image_url).toBe('logo.png');
    });

    it('can restrict country radio results to curated station aliases', async () => {
        const store = new MusicAssistantStore();
        vi.spyOn(store, 'search').mockResolvedValue(ok(emptySearchResults({
            radio: [
                { uri: 'tunein://bbc-radio-1', item_id: 'bbc', name: 'BBC Radio 1', media_type: 'radio', provider: 'tunein' },
                { uri: 'tunein://qmusic-nl', item_id: 'qnl', name: 'Qmusic', media_type: 'radio', provider: 'tunein' },
                { uri: 'tunein://qmusic-belgium', item_id: 'qbe', name: 'Qmusic Belgium', media_type: 'radio', provider: 'tunein' },
                { uri: 'tunein://radio-538', item_id: '538', name: 'Radio 538', media_type: 'radio', provider: 'tunein' },
                { uri: 'tunein://random', item_id: 'random', name: 'Random International Hits', media_type: 'radio', provider: 'tunein' }
            ]
        })));

        const result = await store.searchRadioStations(['Dutch radio'], 20, {
            stationAliases: [
                { key: 'Qmusic', aliases: ['Qmusic'] },
                { key: 'Radio 538', aliases: ['Radio 538', '538'] }
            ],
            rejectedNamePhrases: ['BBC', 'Belgium']
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(result.value.map((station) => station.name)).toEqual(['Qmusic', 'Radio 538']);
    });

    it('uses Home Assistant Radio Browser country metadata when available', async () => {
        const store = new MusicAssistantStore();
        const sendMessagePromise = vi.fn().mockResolvedValue({
            children: [
                {
                    title: 'NPO Radio 2',
                    identifier: 'station-npo2',
                    domain: 'radio_browser',
                    media_content_type: 'audio/mpeg',
                    can_play: true,
                    thumbnail: 'https://example.com/npo2.png'
                },
                {
                    title: 'NPO Radio 2',
                    identifier: 'station-npo2-duplicate',
                    domain: 'radio_browser',
                    media_content_type: 'audio/mpeg',
                    can_play: true
                },
                {
                    title: 'Dutch category',
                    identifier: 'country/NL',
                    domain: 'radio_browser',
                    can_expand: true,
                    can_play: false
                }
            ]
        });

        haStore.connection = { sendMessagePromise } as any;

        const result = await store.getRadioBrowserCountryStations('nl', 20);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        expect(sendMessagePromise).toHaveBeenCalledWith({
            type: 'media_source/browse_media',
            media_content_id: 'media-source://radio_browser/country/NL'
        });
        expect(result.value).toEqual([
            expect.objectContaining({
                name: 'NPO Radio 2',
                provider: 'radio_browser',
                uri: 'media-source://radio_browser/station-npo2',
                media_content_type: 'audio/mpeg',
                countryCode: 'NL',
                image_url: 'https://example.com/npo2.png'
            })
        ]);
    });
});
