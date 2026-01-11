<script lang="ts">
    interface Props {
        value: number;
        onchange: (newValue: number) => void;
        class?: string;
    }

    let { value, onchange, class: className = "" }: Props = $props();

    let internalValue = $state("");

    // Update internal value when prop changes
    $effect.pre(() => {
        internalValue = value.toString();
    });

    function handleEnter(e: KeyboardEvent) {
        if (e.key === "Enter") {
            const num = parseInt(internalValue);
            if (!isNaN(num)) {
                onchange(num);
            }
            (e.target as HTMLInputElement).blur();
        }
    }

    function handleBlur() {
        const num = parseInt(internalValue);
        if (!isNaN(num)) {
            onchange(num);
        } else {
            internalValue = value.toString();
        }
    }
</script>

<div
    class="grid-dimension-pill bg-m3-secondary-container text-m3-on-secondary-container focus-within:bg-m3-primary focus-within:text-m3-on-primary flex items-center justify-center rounded-m3-full px-1.5 py-0.5 text-[10px] font-medium shadow-m3-1 hover:shadow-m3-2 transition-colors cursor-pointer {className}"
>
    <input
        type="text"
        bind:value={internalValue}
        onkeydown={handleEnter}
        onblur={handleBlur}
        class="w-6 bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-center"
    />
</div>

<style>
    .grid-dimension-pill {
        /* Ensure it's above other grid elements but below overlays if necessary */
        z-index: 50;
        pointer-events: auto;
    }

    input {
        font-family: inherit;
        color: inherit;
    }
</style>
