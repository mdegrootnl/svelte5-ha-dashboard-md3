<script lang="ts">
    import IconEdit from "~icons/material-symbols/edit";
    import { cardEditorStore } from "$lib/features/dashboard/stores/cardEditor.svelte";

    interface Props {
        id?: string;
        title?: string;
        subtitle?: string;
        class?: string;

        // Smart/Config Props
        entityId?: string; // Not typically used for title cards but keeps interface consistent
        name: string;
        domainFilter?: string;
        alignment?: "start" | "center" | "end";
        ondelete?: () => void;
        color?: string;
        backgroundColor?: string;
    }

    let {
        id,
        title = $bindable(""),
        subtitle = $bindable(""),
        class: className = "",
        entityId = $bindable(""),
        name = $bindable(""),
        domainFilter = $bindable(""),
        alignment = $bindable("start"),
        ondelete,
        color = $bindable(),
        backgroundColor = $bindable(),
    }: Props = $props();

    // Use name as title if provided and title is empty
    $effect(() => {
        if (name && !title) {
            title = name;
        }
    });

    function openConfig(e: Event) {
        e.stopPropagation();
        cardEditorStore.open({
            id: id,
            entityId: "",
            name: title || "",
            // Use type assertion or extended config type to pass subtitle
            // For now, we rely on the editor handling extra props or we need to update open() signature
            // But since open() takes CardConfig, and we added TitleCardConfig, this should be fine
            // IF we construct the object correctly.
            type: "title",
            subtitle: subtitle,
            alignment: alignment,
            onSave: (newConfig) => {
                if (newConfig.type === "title") {
                    title = newConfig.name || ""; // Mapping name -> title
                    subtitle = newConfig.subtitle || "";
                    alignment = newConfig.alignment || "start";
                    color = newConfig.color;
                    backgroundColor = newConfig.backgroundColor;
                }
            },
            onDelete: ondelete,
        });
    }

    // Map alignment to justify classes
    let justifyClass = $derived(
        alignment === "center"
            ? "justify-center"
            : alignment === "end"
              ? "justify-end"
              : "justify-start",
    );
</script>

<div
    class="relative flex flex-col {justifyClass} text-start w-full h-full p-1 gap-0.5 rounded-xl group {className} overflow-visible z-10 @container"
    style={`container-type: size;${backgroundColor ? ` background-color: ${backgroundColor};` : ""}`}
>
    <h2
        class="text-[clamp(1.5rem,8cqmin,3rem)] leading-tight whitespace-nowrap"
        style:color={color || "var(--color-m3-on-surface)"}
    >
        {title}
    </h2>
    {#if subtitle}
        <p
            class="text-[clamp(0.8rem,5cqmin,1.5rem)] leading-tight whitespace-nowrap opacity-70"
            style:color={color || "var(--color-m3-on-surface-variant)"}
        >
            {subtitle}
        </p>
    {/if}

    <!-- Edit FAB (Visible on Hover in edit mode) -->
    <button
        class="absolute top-[clamp(0.25rem,2cqmin,0.75rem)] right-[clamp(0.25rem,2cqmin,0.75rem)] p-[clamp(0.25rem,1.7cqmin,0.5rem)] rounded-full bg-m3-primary-container text-m3-on-primary-container shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-30 hover:brightness-110 pointer-events-auto"
        onclick={openConfig}
        onpointerdown={(e) => e.stopPropagation()}
        title="Edit Card"
    >
        <IconEdit class="size-[clamp(0.875rem,3.5cqmin,1.25rem)]" />
    </button>
</div>
