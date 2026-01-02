<script lang="ts">
    interface Props {
        checked?: boolean;
        disabled?: boolean;
        onchange?: (checked: boolean) => void;
        class?: string;
    }

    let {
        checked = $bindable(false),
        disabled = false,
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
    class="relative inline-flex items-center cursor-pointer {disabled
        ? 'opacity-38 cursor-not-allowed'
        : ''} {className}"
>
    <input
        type="checkbox"
        class="sr-only peer"
        {checked}
        {disabled}
        onchange={handleChange}
    />

    <!-- Track -->
    <div
        class="
        w-[52px] h-8
        bg-m3-surface-container-highest
        peer-focus:outline-none
        peer-focus:ring-2 peer-focus:ring-m3-primary/20
        rounded-m3-full
        peer
        peer-checked:bg-m3-primary
        peer-checked:border-m3-primary
        border-2 border-m3-outline
        transition-colors duration-200
    "
    ></div>

    <!-- Thumb -->
    <!-- Unchecked: size 16, translate 6 (inside 2+4?), Outline colored? No, usually on-surface-variant or outline. -->
    <!-- Checked: size 24, translate to end, On-Primary colored. -->
    <div
        class="
        absolute left-[8px] top-[8px]
        bg-m3-outline
        w-4 h-4
        rounded-full
        transition-all duration-200
        peer-checked:translate-x-5
        peer-checked:bg-m3-on-primary
        peer-checked:w-6 peer-checked:h-6 peer-checked:top-[4px] peer-checked:left-[4px]
        peer-checked:transform
    "
    >
        <!-- Icon could go here (check/x) -->
    </div>
</label>
