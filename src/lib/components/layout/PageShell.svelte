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
    }

    let {
        title,
        description,
        maxWidth = "max-w-7xl",
        children,
        actions,
        icon,
    }: Props = $props();
</script>

<ScrollArea.Root class="h-full w-full bg-m3-surface overflow-hidden">
    <ScrollArea.Viewport class="h-full w-full p-8 pb-32 md:pb-8">
        <div class="{maxWidth} mx-auto flex flex-col gap-8">
            <header class="flex items-start justify-between">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-4">
                        {#if icon}
                            <div
                                class="flex items-center justify-center text-m3-primary"
                            >
                                {@render icon()}
                            </div>
                        {/if}
                        <h1 class="text-m3-display-small text-m3-on-surface">
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
                    <div class="flex items-center gap-2">
                        {@render actions()}
                    </div>
                {/if}
            </header>
            {@render children()}
        </div>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar
        orientation="vertical"
        class="flex select-none touch-none p-0.5 bg-m3-surface-container-low transition-colors duration-[160ms] ease-out hover:bg-m3-surface-container-high data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
    >
        <ScrollArea.Thumb
            class="flex-1 bg-m3-outline-variant rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
        />
    </ScrollArea.Scrollbar>
    <ScrollArea.Corner />
</ScrollArea.Root>
