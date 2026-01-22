<script lang="ts">
    import {
        today,
        getLocalTimeZone,
        startOfMonth,
        endOfMonth,
        startOfWeek,
        endOfWeek,
        CalendarDate,
        DateFormatter,
        isSameDay,
        toCalendarDate,
        now,
    } from "@internationalized/date";
    import { untrack } from "svelte";
    import { haStore } from "$lib/stores/ha.svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import ChevronLeft from "~icons/material-symbols/chevron-left";
    import ChevronRight from "~icons/material-symbols/chevron-right";
    import IconLocation from "~icons/material-symbols/location-on";
    import AgendaItem from "$lib/features/calendar/components/AgendaItem.svelte";

    // --- State ---
    let timeZone = getLocalTimeZone();
    let currentDate = $state(today(timeZone)); // "Today"
    let focusedDate = $state(today(timeZone)); // Navigation state
    let selectedDate = $state(today(timeZone)); // Selection for sidebar
    let events = $state<any[]>([]);
    let loading = $state(false);
    let lastFetch = 0;

    // --- Derived ---
    let currentMonthStart = $derived(startOfMonth(focusedDate));
    let monthName = $derived(
        new DateFormatter("en-US", { month: "long", year: "numeric" }).format(
            currentMonthStart.toDate(timeZone),
        ),
    );

    // Grid Generation (Month View)
    let days = $derived.by(() => {
        let d = startOfWeek(currentMonthStart, "en-US");
        const end = endOfWeek(endOfMonth(focusedDate), "en-US");
        const grid: CalendarDate[] = [];

        while (d.compare(end) <= 0) {
            grid.push(d);
            d = d.add({ days: 1 });
        }
        return grid;
    });

    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    // Agenda Generation (Right Side)
    // Filter events starting from selectedDate, group by day
    let agendaGroups = $derived.by(() => {
        // Sort events by start time
        const sorted = [...events].sort((a, b) => a.start.compare(b.start));

        // Filter: Only future events (or events on selected date onwards)
        // We'll show next 7 days or so, or just all fetched events that are >= selectedDate
        const upcoming = sorted.filter((e) => {
            // e.start is now guaranteed to be a comparable CalendarDate-like object
            const eDate = toCalDate(e.start);
            // We use simple comparison of YMD
            return eDate.compare(selectedDate) >= 0;
        });

        // Group
        const groups: { label: string; date: CalendarDate; events: any[] }[] =
            [];
        const formatter = new DateFormatter("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
        });

        upcoming.forEach((e) => {
            const eDate = toCalDate(e.start);
            let label = formatter.format(eDate.toDate(timeZone));

            if (isSameDay(eDate, currentDate)) label = "Today";
            else if (isSameDay(eDate, currentDate.add({ days: 1 })))
                label = "Tomorrow";
            else label = label.toUpperCase(); // Design choice from screenshot

            let group = groups.find((g) => isSameDay(g.date, eDate));
            if (!group) {
                group = { label, date: eDate, events: [] };
                groups.push(group);
            }
            group.events.push(e);
        });

        return groups.slice(0, 5); // Limit to next few groups to avoid overflow
    });

    // --- Actions ---
    function prevMonth() {
        focusedDate = focusedDate.subtract({ months: 1 });
        fetchEvents();
    }

    function nextMonth() {
        focusedDate = focusedDate.add({ months: 1 });
        fetchEvents();
    }

    function selectDate(date: CalendarDate) {
        selectedDate = date;
    }

    // --- Data Fetching ---
    async function fetchEvents() {
        if (loading || !haStore.connected) return;

        // Aggressive 10s throttle
        if (Date.now() - lastFetch < 10000) return;
        lastFetch = Date.now();

        // Fetch a broad range: Start of viewed month -> End of viewed month + extra for agenda
        const start = startOfWeek(startOfMonth(focusedDate), "en-US");
        const end = endOfWeek(endOfMonth(focusedDate), "en-US");

        loading = true;
        try {
            const calendarEntities = untrack(() =>
                Object.entries(haStore.states)
                    .filter(
                        ([id, state]) =>
                            id.startsWith("calendar.") &&
                            state.state !== "unavailable",
                    )
                    .map(([id]) => id),
            );

            if (calendarEntities.length === 0) {
                events = [];
                return;
            }

            const result = await haStore.callService(
                "calendar",
                "get_events",
                {
                    start_date_time:
                        start.toDate(timeZone).toISOString().split(".")[0] +
                        "Z",
                    end_date_time:
                        end.toDate(timeZone).toISOString().split(".")[0] + "Z",
                    entity_id: calendarEntities,
                },
                {},
                true,
            );

            if (result.ok) {
                const response = result.value;
                // The service call returns { context: {...}, response: { "calendar.id": ... } }
                // We need to access the inner .response if it exists, otherwise use response directly
                const calendarData = response.response || response;

                const allEvents: any[] = [];
                Object.entries(calendarData).forEach(
                    ([entityId, data]: [string, any]) => {
                        if (
                            !data ||
                            !data.events ||
                            !Array.isArray(data.events)
                        ) {
                            console.warn(
                                `Skipping invalid calendar response for ${entityId}`,
                                data,
                            );
                            return;
                        }
                        const entityEvents = data.events.map((e: any) => ({
                            ...e,
                            entity_id: entityId,
                            start: parseHADate(e.start), // Returns parsed object
                            end: parseHADate(e.end),
                            isAllDay: !e.start.includes("T"),
                        }));
                        allEvents.push(...entityEvents);
                    },
                );
                events = allEvents;
            }
        } catch (e) {
            console.error("Failed to fetch calendar events:", e);
        } finally {
            loading = false;
        }
    }

    // Helper to parse HA date strings to comparable objects
    function parseHADate(dateStr: string) {
        if (dateStr.includes("T")) {
            // ISO string (e.g., 2023-10-31T10:00:00)
            const [date, time] = dateStr.split("T");
            const [y, m, d] = date.split("-").map(Number);
            const [h, min, s] = time.split(":").map(Number);

            // Return object with required properties for UI + compare
            return {
                year: y,
                month: m,
                day: d,
                hour: h,
                minute: min,
                second: s,
                compare: (other: any) => {
                    if (y !== other.year) return y - other.year;
                    if (m !== other.month) return m - other.month;
                    if (d !== other.day) return d - other.day;
                    // Only compare time if other has time
                    return (h || 0) - (other.hour || 0);
                },
                toString: () => dateStr,
            };
        } else {
            // Simple Date (All Day)
            const [y, m, d] = dateStr.split("-").map(Number);
            return {
                year: y,
                month: m,
                day: d,
                compare: (other: any) => {
                    if (y !== other.year) return y - other.year;
                    if (m !== other.month) return m - other.month;
                    return d - other.day;
                },
                toString: () => dateStr,
            };
        }
    }

    // Safe conversion to CalendarDate for grouping/filtering
    function toCalDate(d: any): CalendarDate {
        return new CalendarDate(d.year, d.month, d.day);
    }

    function formatTime(d: any) {
        if (!d.hour && d.hour !== 0) return "All Day";
        let h = d.hour;
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12;
        const m = d.minute.toString().padStart(2, "0");
        return `${h}:${m} ${ampm}`;
    }

    function getEventsForDay(date: CalendarDate) {
        return events.filter((e) => {
            const eDate = toCalDate(e.start);
            return isSameDay(eDate, date);
        });
    }

    function getCalendarColor(entityId: string) {
        const colors = [
            "bg-blue-500",
            "bg-red-500",
            "bg-green-500",
            "bg-yellow-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
            "bg-teal-500",
        ];
        let hash = 0;
        for (let i = 0; i < entityId.length; i++) {
            hash = entityId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    function getBorderColor(entityId: string) {
        const colors = [
            "bg-blue-500",
            "bg-red-500",
            "bg-green-500",
            "bg-yellow-500",
            "bg-purple-500",
            "bg-pink-500",
            "bg-indigo-500",
            "bg-teal-500",
        ];
        let hash = 0;
        for (let i = 0; i < entityId.length; i++) {
            hash = entityId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    $effect(() => {
        // Explicitly track these dependencies
        const isConnected = haStore.connected;
        const currentFocusedMonth = focusedDate.month;
        const currentFocusedYear = focusedDate.year;

        if (isConnected) {
            // We untrack the actual fetch because it internally reads haStore.states.
            // This prevents an infinite loop where entity updates trigger a re-fetch.
            untrack(() => {
                fetchEvents();
            });
        }
    });
</script>

<PageShell title="Calendar">
    <!-- Main Container: Spans full height, splits on laptop+ -->
    <div
        class="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-m3-surface text-m3-on-surface"
    >
        <!-- Left Pane: Monthly Calendar -->
        <div class="flex-1 flex flex-col p-6 min-w-0">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <h1 class="text-4xl font-light tracking-tight">{monthName}</h1>
                <div class="flex gap-4">
                    <button
                        class="w-12 h-12 flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface transition-colors"
                        onclick={prevMonth}
                        aria-label="Previous Month"
                    >
                        <ChevronLeft class="text-3xl" />
                    </button>
                    <button
                        class="w-12 h-12 flex items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container-highest hover:text-m3-on-surface transition-colors"
                        onclick={nextMonth}
                        aria-label="Next Month"
                    >
                        <ChevronRight class="text-3xl" />
                    </button>
                </div>
            </div>

            <!-- Days of Week -->
            <div class="grid grid-cols-7 mb-4">
                {#each weekDays as day}
                    <div
                        class="text-center text-xl text-m3-on-surface-variant/70 font-light"
                    >
                        {day}
                    </div>
                {/each}
            </div>

            <!-- Calendar Grid -->
            <!-- Minimalist: No borders, just spacing -->
            <div class="grid grid-cols-7 auto-rows-fr gap-y-4 flex-1">
                {#each days as date}
                    {@const isCurrentMonth = date.month === focusedDate.month}
                    {@const isToday = isSameDay(date, currentDate)}
                    {@const isSelected = isSameDay(date, selectedDate)}
                    {@const dayEvents = getEventsForDay(date)}

                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                        class="flex flex-col items-center min-h-[80px] group cursor-pointer relative"
                        onclick={() => selectDate(date)}
                        class:opacity-30={!isCurrentMonth}
                    >
                        <!-- Selection Indicator (Optional) -->
                        {#if isSelected && !isToday}
                            <div
                                class="absolute inset-0 bg-m3-secondary-container/20 rounded-lg -z-10"
                            ></div>
                        {/if}

                        <!-- Date Number -->
                        <div
                            class="
                            text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full mb-1
                            {isToday
                                ? 'bg-m3-error text-m3-on-error font-medium shadow-md'
                                : 'text-m3-on-surface'}
                        "
                        >
                            {date.day}
                        </div>

                        <!-- Event Text/Bars -->
                        <div class="w-full px-1 flex flex-col gap-0.5 mt-1">
                            {#each dayEvents.slice(0, 3) as event}
                                <div
                                    class="
                                        text-[9px] leading-tight px-1.5 py-0.5 rounded-sm truncate font-medium
                                        {getCalendarColor(event.entity_id)}
                                        text-white/90
                                    "
                                    title={event.summary}
                                >
                                    {event.summary}
                                </div>
                            {/each}
                            {#if dayEvents.length > 3}
                                <div
                                    class="text-[9px] text-m3-on-surface-variant text-center leading-none"
                                >
                                    +{dayEvents.length - 3} more
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Right Pane: Agenda View (Today/Upcoming) -->
        <!-- Fixed width on desktop, full width on mobile -->
        <div
            class="
            lg:w-[400px] w-full flex flex-col
            border-t lg:border-t-0 lg:border-l border-m3-outline-variant
            bg-m3-surface-container-low
            overflow-hidden
        "
        >
            <!-- Agenda Header -->
            <div class="p-6 pb-2">
                <h2 class="text-m3-headline-small font-medium">Agenda</h2>
                <!-- Selected Date Context -->
                <p class="text-m3-title-small text-m3-on-surface-variant mt-1">
                    From {new DateFormatter("en-US", {
                        month: "long",
                        day: "numeric",
                    }).format(selectedDate.toDate(timeZone))}
                </p>
            </div>

            <!-- Scrollable List -->
            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                {#each agendaGroups as group}
                    <div class="flex flex-col gap-2">
                        <!-- Group Header -->
                        <h3
                            class="text-m3-title-medium font-bold text-m3-on-surface uppercase tracking-wide opacity-90"
                        >
                            {group.label}
                        </h3>

                        <!-- Events List -->
                        <div class="flex flex-col gap-3">
                            {#each group.events as event}
                                <AgendaItem {event} />
                            {/each}
                        </div>
                    </div>
                {/each}

                {#if agendaGroups.length === 0}
                    <div
                        class="flex flex-col items-center justify-center py-12 text-m3-on-surface-variant/60"
                    >
                        <div class="text-4xl mb-2">🎉</div>
                        <p>No upcoming events</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</PageShell>
