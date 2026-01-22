<script lang="ts">
    import { DateFormatter } from "@internationalized/date";
    import IconLocation from "~icons/material-symbols/location-on";

    interface Props {
        event: any;
        showDate?: boolean;
    }

    let { event, showDate = false }: Props = $props();

    function formatTime(d: any) {
        if (!d.hour && d.hour !== 0) return "All Day";
        let h = d.hour;
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        h = h ? h : 12;
        const m = d.minute.toString().padStart(2, "0");
        return `${h}:${m} ${ampm}`;
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
</script>

<div
    class="bg-m3-surface-container rounded-md overflow-hidden flex shadow-sm min-h-[80px]"
>
    <!-- Sidebar Color Strip -->
    <div class="w-1.5 {getBorderColor(event.entity_id)} h-full shrink-0"></div>

    <div class="flex-1 p-3 flex flex-col justify-center">
        <!-- Time -->
        <div class="text-m3-title-small font-bold text-m3-primary mb-0.5">
            {formatTime(event.start)}
            {#if !event.isAllDay}
                — {formatTime(event.end)}
            {/if}
        </div>

        <!-- Title -->
        <div
            class="text-m3-body-large text-m3-on-surface font-medium leading-tight"
        >
            {event.summary}
        </div>

        <!-- Location (if exists) -->
        {#if event.location}
            <div
                class="flex items-center gap-1 mt-1 text-m3-label-medium text-m3-on-surface-variant"
            >
                <IconLocation class="text-xs" />
                <span class="truncate">{event.location}</span>
            </div>
        {/if}
    </div>
</div>
