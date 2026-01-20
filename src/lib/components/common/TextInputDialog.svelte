<script lang="ts">
    import { onMount } from "svelte";
    import IconClose from "~icons/material-symbols/close";
    import { portal } from "$lib/actions/portal";

    interface Props {
        title?: string;
        label?: string;
        initialValue?: string;
        placeholder?: string;
        onconfirm: (value: string) => void;
        oncancel: () => void;
    }

    let {
        title = "Rename",
        label = "Name",
        initialValue = "",
        placeholder = "Enter name...",
        onconfirm,
        oncancel,
    }: Props = $props();

    // Use local state for input
    let inputValue = $state("");

    // Set initial value on mount
    onMount(() => {
        inputValue = initialValue;
    });

    function handleConfirm() {
        if (inputValue.trim()) {
            onconfirm(inputValue.trim());
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            handleConfirm();
        } else if (e.key === "Escape") {
            oncancel();
        }
    }
</script>

<div
    class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
    onclick={oncancel}
    role="button"
    tabindex="-1"
    onkeydown={(e) => e.key === "Escape" && oncancel()}
    use:portal
>
    <div
        class="bg-m3-surface-container-high rounded-m3-xl p-6 w-full max-w-sm flex flex-col gap-6 shadow-xl"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="-1"
        onkeydown={() => {}}
    >
        <!-- Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-m3-headline-small text-m3-on-surface">{title}</h3>
            <button
                onclick={oncancel}
                class="text-m3-on-surface-variant hover:text-m3-on-surface transition-colors"
            >
                <IconClose class="size-6" />
            </button>
        </div>

        <!-- Input -->
        <div class="flex flex-col gap-2">
            <label
                for="rename-input"
                class="text-m3-body-small text-m3-on-surface-variant"
            >
                {label}
            </label>
            <input
                id="rename-input"
                type="text"
                bind:value={inputValue}
                {placeholder}
                onkeydown={handleKeydown}
                class="w-full h-12 px-4 rounded-m3-sm border border-m3-outline bg-transparent text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-m3-primary focus:border-m3-primary transition-colors"
            />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2">
            <button
                onclick={oncancel}
                class="px-6 py-2.5 rounded-full text-m3-label-large text-m3-primary hover:bg-m3-primary/10 transition-colors"
            >
                Cancel
            </button>
            <button
                onclick={handleConfirm}
                disabled={!inputValue.trim()}
                class="px-6 py-2.5 rounded-full text-m3-label-large bg-m3-primary text-m3-on-primary hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Confirm
            </button>
        </div>
    </div>
</div>
