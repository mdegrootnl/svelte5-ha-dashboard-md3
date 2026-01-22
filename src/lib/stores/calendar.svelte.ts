import { haStore } from './ha.svelte';
import { createLogger } from '$lib/utils/logger';

const logger = createLogger('CalendarStore');

export interface CalendarEvent {
    start: Date;
    end: Date;
    summary: string;
    description?: string;
    location?: string;
    allDay: boolean;
}

export class CalendarStore {
    events = $state<CalendarEvent[]>([]);
    loading = $state(false);

    constructor() {
        // Optional: Auto-fetch on init or rely on consumers calling fetch
    }

    async fetchUpcoming(limit = 5) {
        if (!haStore.connection) return;

        this.loading = true;
        try {
            // Get all calendar entities
            const calendarEntities = Object.keys(haStore.states).filter(id => id.startsWith('calendar.'));

            if (calendarEntities.length === 0) {
                this.events = [];
                return;
            }

            const now = new Date();
            const end = new Date();
            end.setDate(end.getDate() + 7); // Fetch next 7 days

            // Fetch events for each calendar
            const promises = calendarEntities.map(async entityId => {
                // Fetch events for each calendar
                // We use if/else instead of try/catch because callService returns a Result
                const result = await haStore.callService('calendar', 'get_events', {
                    start_date_time: now.toISOString(),
                    end_date_time: end.toISOString()
                }, { entity_id: entityId }, true);

                if (!result.ok) {
                    logger.warn(`Failed to fetch events for ${entityId}`, result.error);
                    return [];
                }

                const response = result.value;

                // Response structure: { "calendar.x": { events: [...] } } or just { events: [...] }
                // Adjust based on actual HA response for this service
                let events = [];
                const payload = response.response ?? response;

                if (payload[entityId]?.events) {
                    events = payload[entityId].events;
                } else if (payload.events) {
                    events = payload.events;
                }

                return events;
            });

            const results = await Promise.all(promises);
            const allEvents = results.flat();

            // Map and Sort
            this.events = allEvents.map((e: any) => {
                // Robust parsing for various HA calendar event structures
                let startStr = e.start?.dateTime || e.start?.date || e.start;
                let endStr = e.end?.dateTime || e.end?.date || e.end;

                // If it's an object with no known keys, try accessing it directly if it's a string (though unlikely for HA)
                if (typeof e.start === 'string') startStr = e.start;
                if (typeof e.end === 'string') endStr = e.end;

                const start = new Date(startStr);
                const end = new Date(endStr);

                // All day check: Identifiable if 'dateTime' is missing but 'date' exists
                // Or if the time is exactly midnight (though risky)
                // Reliable HA method: presence of 'date' field and absence of 'dateTime'
                const allDay = !!(e.start?.date && !e.start?.dateTime);

                return {
                    start,
                    end,
                    summary: e.summary,
                    description: e.description,
                    location: e.location,
                    allDay
                };
            }).sort((a, b) => a.start.getTime() - b.start.getTime())
                .slice(0, limit);

        } catch (e) {
            logger.error('Failed to fetch calendar events', e);
        } finally {
            this.loading = false;
        }
    }
}

export const calendarStore = new CalendarStore();
