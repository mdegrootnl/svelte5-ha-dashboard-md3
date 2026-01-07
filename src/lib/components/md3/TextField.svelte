<script lang="ts">
    import { type Component } from "svelte";

    type Variant = "filled" | "outlined";

    interface Props {
        variant?: Variant;
        label: string;
        value?: string;
        placeholder?: string;
        type?: "text" | "password" | "email" | "number";
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
        type = "text",
        error = false,
        supportingText,
        leadingIcon: LeadingIcon,
        trailingIcon: TrailingIcon,
        disabled = false,
        class: className = "",
        oninput,
    }: Props = $props();

    // Track if input is focused or has value for label animation
    let isFocused = $state(false);
    let hasValue = $derived(value.length > 0);
    let isFloating = $derived(isFocused || hasValue);
</script>

{#if variant === "outlined"}
    <!-- MD3 Outlined Text Field with proper notch -->
    <div class="flex flex-col gap-1 w-full {className}">
        <div class="relative min-h-[56px]">
            <!-- Border container using fieldset for the notch effect -->
            <fieldset
                class="absolute inset-0 m-0 px-2 pointer-events-none rounded-[4px] transition-colors duration-200
                       {isFocused
                    ? 'border-2 border-m3-primary'
                    : 'border border-m3-outline'}
                       {error ? 'border-m3-error' : ''}"
                style="padding-top: 0; top: -5px; bottom: 0;"
            >
                <!-- Legend creates the notch - width animates with label -->
                <legend
                    class="h-[2px] overflow-hidden transition-all duration-200 px-0.5
                           {isFloating
                        ? 'text-m3-body-small'
                        : 'text-[0px] max-w-[0.01px]'}"
                    style="margin-left: 8px;"
                >
                    <span class="px-0.5 invisible">{label}</span>
                </legend>
            </fieldset>

            <!-- Input container -->
            <div class="relative flex items-center min-h-[56px]">
                <!-- Leading Icon -->
                {#if LeadingIcon}
                    <span class="pl-3 pr-2 text-m3-on-surface-variant z-10">
                        <LeadingIcon />
                    </span>
                {/if}

                <!-- Input wrapper -->
                <div class="relative flex-1 h-full">
                    <input
                        bind:value
                        {placeholder}
                        {disabled}
                        {oninput}
                        {type}
                        onfocus={() => (isFocused = true)}
                        onblur={() => (isFocused = false)}
                        class="
                            w-full bg-transparent px-4 h-[56px]
                            text-m3-body-large text-m3-on-surface caret-m3-primary
                            outline-none placeholder-transparent
                        "
                        id="input-{label}"
                    />

                    <!-- Floating Label - positioned to sit on border when floating -->
                    <label
                        for="input-{label}"
                        class="
                            absolute left-3 pointer-events-none
                            transition-all duration-200 origin-left
                            {isFloating
                            ? 'top-0 -translate-y-1/2 text-m3-body-small bg-m3-surface-container-high px-1'
                            : 'top-1/2 -translate-y-1/2 text-m3-body-large'}
                            {isFocused
                            ? 'text-m3-primary'
                            : 'text-m3-on-surface-variant'}
                            {error ? 'text-m3-error' : ''}
                        "
                    >
                        {label}
                    </label>
                </div>

                <!-- Trailing Icon -->
                {#if TrailingIcon}
                    <span class="pr-3 pl-2 text-m3-on-surface-variant z-10">
                        <TrailingIcon />
                    </span>
                {/if}
            </div>
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
{:else}
    <!-- MD3 Filled Text Field (original implementation) -->
    <div class="flex flex-col gap-1 w-full relative {className}">
        <div
            class="relative flex items-center min-h-[56px] w-full transition-colors duration-200
                   bg-m3-surface-container-highest
                   rounded-t-m3-xs rounded-b-none
                   border-b border-m3-on-surface-variant
                   hover:bg-m3-on-surface-variant/8
                   hover:border-m3-on-surface
                   focus-within:border-b-2 focus-within:border-m3-primary
                   {error
                ? 'border-m3-error focus-within:border-m3-error'
                : ''}"
        >
            <!-- Leading Icon -->
            {#if LeadingIcon}
                <span class="pl-3 pr-2 text-m3-on-surface-variant">
                    <LeadingIcon />
                </span>
            {/if}

            <!-- Input -->
            <div class="relative flex-1 h-full min-h-[56px]">
                <input
                    bind:value
                    {placeholder}
                    {disabled}
                    {oninput}
                    {type}
                    class="
                        peer w-full h-full bg-transparent px-4
                        text-m3-body-large text-m3-on-surface caret-m3-primary
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
                <span class="pr-3 pl-2 text-m3-on-surface-variant">
                    <TrailingIcon />
                </span>
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
{/if}
