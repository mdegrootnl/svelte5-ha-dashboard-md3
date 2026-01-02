<script lang="ts">
    interface Props {
        checked?: boolean;
        disabled?: boolean;
        indeterminate?: boolean;
        onchange?: (checked: boolean) => void;
        class?: string;
    }

    let {
        checked = $bindable(false),
        disabled = false,
        indeterminate = false,
        onchange,
        class: className = "",
    }: Props = $props();

    function handleChange(e: Event) {
        if (disabled) return;
        checked = (e.target as HTMLInputElement).checked;
        onchange?.(checked);
    }
</script>

<label
    class="relative inline-flex items-center justify-center w-10 h-10 cursor-pointer {disabled
        ? 'opacity-38 cursor-not-allowed'
        : ''} {className}"
>
    <input
        type="checkbox"
        class="sr-only peer"
        {checked}
        {disabled}
        {indeterminate}
        onchange={handleChange}
    />

    <!-- State Layer -->
    <div
        class="absolute inset-0 rounded-full hover:bg-m3-on-surface/8 peer-focus:bg-m3-on-surface/12 transition-colors"
    ></div>

    <!-- Box -->
    <div
        class="
        w-4.5 h-4.5
        border-2 border-m3-on-surface-variant
        rounded-[2px]
        peer-checked:bg-m3-primary peer-checked:border-m3-primary
        peer-indeterminate:bg-m3-primary peer-indeterminate:border-m3-primary
        flex items-center justify-center
        transition-colors duration-200
    "
    >
        {#if indeterminate}
            <div class="w-3 h-0.5 bg-m3-on-primary"></div>
        {:else if checked}
            <svg
                class="w-3.5 h-3.5 text-m3-on-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
        {/if}
    </div>
</label>
