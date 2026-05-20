<script lang="ts">
    import { resolveMaterialIconName } from "$lib/utils/materialIcon";

    /**
     * DynamicIcon - Renders Material Symbols icons by name
     *
     * Uses the Material Symbols Outlined font for full icon set support.
     * Icon names should be in snake_case format (e.g., "home", "lightbulb", "local_fire_department").
     *
     * @see https://fonts.google.com/icons for the full icon set
     */

    let {
        name,
        class: className = "",
        style: customStyle = "",
    }: {
        name: string;
        class?: string;
        style?: string;
    } = $props();

    let resolvedName = $derived(resolveMaterialIconName(name));
</script>

<span
    class="inline-flex items-center justify-center overflow-hidden leading-none {className}"
    style="container-type: size; {customStyle}"
>
    <span
        class="material-symbols-outlined block select-none leading-none"
        style="font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; font-size: clamp(0.875rem, max(78cqmin, 1em), 3rem);"
        >{resolvedName}</span
    >
</span>
