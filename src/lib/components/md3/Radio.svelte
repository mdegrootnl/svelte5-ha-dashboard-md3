<script lang="ts">
    interface Props {
        group?: any;
        value: any;
        disabled?: boolean;
        onchange?: (val: any) => void;
        class?: string;
    }

    let {
        group = $bindable(),
        value,
        disabled = false,
        onchange,
        class: className = "",
    }: Props = $props();

    function handleChange() {
        if (disabled) return;
        group = value;
        onchange?.(value);
    }

    let checked = $derived(group === value);
</script>

<label
    class="relative inline-flex items-center justify-center w-10 h-10 cursor-pointer {disabled
        ? 'opacity-38 cursor-not-allowed'
        : ''} {className}"
>
    <input
        type="radio"
        class="sr-only peer"
        {value}
        {disabled}
        {checked}
        onchange={handleChange}
    />

    <!-- State Layer -->
    <div
        class="absolute inset-0 rounded-full hover:bg-m3-on-surface/8 peer-focus:bg-m3-on-surface/12 transition-colors"
    ></div>

    <!-- Outer Ring -->
    <div
        class="
        w-5 h-5
        border-2
        rounded-full
        flex items-center justify-center
        transition-all duration-200
        {checked
            ? 'border-m3-primary bg-m3-primary'
            : 'border-m3-on-surface-variant bg-transparent group-hover:bg-m3-on-surface/5'}
    "
    >
        <!-- Inner Circle -->
        <div
            class="
            w-2 h-2
            rounded-full
            bg-m3-on-primary
            scale-0 peer-checked:scale-100
            transition-transform duration-200
        "
        ></div>
    </div>
</label>
