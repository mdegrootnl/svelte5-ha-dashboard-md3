<script lang="ts">
    import { type Snippet } from "svelte";
    import { ScrollArea } from "bits-ui";

    interface Props {
        title: string;
        description?: string;
        maxWidth?: string; // Standard utility class instead of mapping
        children: Snippet;
        actions?: Snippet;
        icon?: Snippet;
        backgroundActive?: boolean;
    }

    let {
        title,
        description,
        maxWidth = "max-w-7xl",
        children,
        actions,
        icon,
        backgroundActive = false,
    }: Props = $props();

    let rootClass = $derived(
        `h-full w-full overflow-hidden ${backgroundActive ? "bg-transparent" : "bg-m3-surface"}`,
    );
    let scrollbarClass = $derived(
        `flex select-none touch-none p-0.5 transition-colors duration-[160ms] ease-out hover:bg-m3-surface-container-high data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 ${
            backgroundActive
                ? "bg-m3-surface-container-low/70 backdrop-blur-md"
                : "bg-m3-surface-container-low"
        }`,
    );
</script>

<ScrollArea.Root class={rootClass}>
    <ScrollArea.Viewport class="h-full w-full p-4 pb-32 sm:p-6 xl:p-8 xl:pb-8">
        <div class="{maxWidth} mx-auto flex flex-col gap-8">
            <header class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex min-w-0 flex-col gap-1">
                    <div class="flex items-center gap-4">
                        {#if icon}
                            <div
                                class="flex size-10 shrink-0 items-center justify-center text-m3-primary"
                            >
                                {@render icon()}
                            </div>
                        {/if}
                        <h1 class="min-w-0 text-m3-display-small leading-tight text-m3-on-surface">
                            {title}
                        </h1>
                    </div>
                    {#if description}
                        <p
                            class="text-m3-body-large text-m3-on-surface-variant"
                        >
                            {description}
                        </p>
                    {/if}
                </div>
                {#if actions}
                    <div class="flex min-w-0 flex-wrap items-center justify-end gap-2">
                        {@render actions()}
                    </div>
                {/if}
            </header>
            {@render children()}
        </div>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar
        orientation="vertical"
        class={scrollbarClass}
    >
        <ScrollArea.Thumb
            class="flex-1 bg-m3-outline-variant rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
        />
    </ScrollArea.Scrollbar>
    <ScrollArea.Corner />
</ScrollArea.Root>
