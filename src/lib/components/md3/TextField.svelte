<script lang="ts">
    import { type Component, type Snippet } from "svelte";

    type Variant = "filled" | "outlined";

    interface Props {
        variant?: Variant;
        label: string;
        value?: string;
        placeholder?: string;
        error?: boolean;
        supportingText?: string;
        leadingIcon?: Component;
        trailingIcon?: Component;
        disabled?: boolean;
        class?: string;
        oninput?: (e: Event) => void;
    }

    let {
        variant = "filled",
        label,
        value = $bindable(""),
        placeholder = "",
        error = false,
        supportingText,
        leadingIcon: LeadingIcon,
        trailingIcon: TrailingIcon,
        disabled = false,
        class: className = "",
        oninput,
    }: Props = $props();

    const baseContainer =
        "relative flex items-center min-h-[56px] w-full transition-colors duration-200";

    // Variant-specific styles
    // Filled: Surface Container Highest, underlines.
    // Outlined: Transparent, borders.

    // Filled styles
    const filledStyles = `
        bg-m3-surface-container-highest 
        rounded-t-m3-xs rounded-b-none 
        border-b border-m3-on-surface-variant 
        hover:bg-m3-on-surface-variant/8 
        hover:border-m3-on-surface
        focus-within:border-b-2 focus-within:border-m3-primary
    `;

    // Outlined styles (Simplified without floating label gap hack for now, relying on pure CSS translation)
    const outlinedStyles = `
        bg-transparent 
        border border-m3-outline 
        rounded-m3-xs
        hover:border-m3-on-surface
        focus-within:border-2 focus-within:border-m3-primary
    `;

    // Error states
    let stateStyles = $derived(
        error
            ? "border-m3-error focus-within:border-m3-error caret-m3-error"
            : "",
    );

    let finalContainer = $derived(
        `${baseContainer} ${variant === "filled" ? filledStyles : outlinedStyles} ${stateStyles} ${className}`,
    );
</script>

<div class="flex flex-col gap-1 w-full relative">
    <div class={finalContainer}>
        <!-- Leading Icon -->
        {#if LeadingIcon}
            <span class="pl-3 pr-2 text-m3-on-surface-variant"
                ><LeadingIcon /></span
            >
        {/if}

        <!-- Input -->
        <div class="relative flex-1 h-full min-h-[56px]">
            <input
                {value}
                {placeholder}
                {disabled}
                {oninput}
                class="
                    peer w-full h-full bg-transparent px-4
                    text-m3-body-large text-m3-on-surface-variant caret-m3-primary
                    outline-none border-none placeholder-transparent
                    pt-4 pb-1
                "
                id="input-{label}"
            />

            <!-- Label as floating text -->
            <label
                for="input-{label}"
                class="
                    absolute left-4 top-4
                    text-m3-body-large text-m3-on-surface-variant
                    duration-200 transform -translate-y-0
                    peer-placeholder-shown:translate-y-0 peer-placeholder-shown:text-m3-body-large
                    peer-focus:-translate-y-3 peer-focus:text-m3-body-small peer-focus:text-m3-primary
                    peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:text-m3-body-small
                    pointer-events-none
                    {error ? 'peer-focus:text-m3-error text-m3-error' : ''}
                "
            >
                {label}
            </label>
        </div>

        <!-- Trailing Icon -->
        {#if TrailingIcon}
            <span class="pr-3 pl-2 text-m3-on-surface-variant"
                ><TrailingIcon /></span
            >
        {/if}
    </div>

    <!-- Supporting Text -->
    {#if supportingText}
        <span
            class="px-4 text-m3-body-small {error
                ? 'text-m3-error'
                : 'text-m3-on-surface-variant'}"
        >
            {supportingText}
        </span>
    {/if}
</div>
