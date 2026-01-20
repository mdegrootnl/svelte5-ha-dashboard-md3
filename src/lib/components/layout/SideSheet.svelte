<script lang="ts">
    import { fade, fly } from "svelte/transition";
    import IconClose from "~icons/material-symbols/close";
    import IconArrowBack from "~icons/material-symbols/arrow-back";
    import { type Snippet } from "svelte";
    import { portal } from "$lib/actions/portal";

    interface Props {
        open: boolean;
        title: string;
        subtitle?: string;
        icon?: any; // Icon component
        showBack?: boolean;
        maxWidth?: string; // Tailwind class, e.g., "max-w-md"
        onclose?: () => void;
        onback?: () => void;
        children: Snippet;
        actions?: Snippet; // Footer actions
    }

    let {
        open = $bindable(false),
        title,
        subtitle,
        icon: Icon,
        showBack = false,
        maxWidth = "max-w-md",
        onclose,
        onback,
        children,
        actions,
    }: Props = $props();

    function handleClose() {
        open = false;
        onclose?.();
    }

    function handleBack() {
        onback?.();
    }

    // Close on escape
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape" && open) {
            handleClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="fixed inset-0 z-[100] bg-m3-scrim/40 backdrop-blur-sm"
        transition:fade={{ duration: 200 }}
        onclick={handleClose}
        role="presentation"
        use:portal
    ></div>

    <!-- Slide-in Panel -->
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <div
        class="fixed top-0 right-0 z-[100] h-full w-full {maxWidth} bg-m3-surface-container-low flex flex-col shadow-2xl"
        transition:fly={{ x: 400, duration: 300, opacity: 1 }}
        role="dialog"
        aria-labelledby="side-sheet-title"
        aria-modal="true"
        use:portal
    >
        <!-- Header -->
        <header
            class="flex items-center gap-3 px-6 py-5 border-b border-m3-outline-variant/30"
        >
            {#if showBack}
                <button
                    class="p-2 -ml-2 rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface hover:text-m3-on-surface transition-colors"
                    onclick={handleBack}
                    aria-label="Back"
                >
                    <IconArrowBack class="size-6" />
                </button>
            {:else if Icon}
                <div
                    class="flex items-center justify-center w-10 h-10 rounded-full bg-m3-primary-container text-m3-on-primary-container"
                >
                    <Icon class="size-5" />
                </div>
            {/if}

            <div class="flex-1">
                <h2
                    id="side-sheet-title"
                    class="text-m3-title-large text-m3-on-surface"
                >
                    {title}
                </h2>
                {#if subtitle}
                    <p class="text-m3-body-small text-m3-on-surface-variant">
                        {subtitle}
                    </p>
                {/if}
            </div>

            <button
                class="p-2 rounded-full hover:bg-m3-on-surface/10 text-m3-on-surface-variant hover:text-m3-on-surface transition-colors"
                onclick={handleClose}
                aria-label="Close"
            >
                <IconClose class="size-6" />
            </button>
        </header>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8">
            {@render children()}
        </div>

        <!-- Footer Actions -->
        {#if actions}
            <footer
                class="px-6 py-4 border-t border-m3-outline-variant/30 flex justify-between gap-3"
            >
                {@render actions()}
            </footer>
        {/if}
    </div>
{/if}
