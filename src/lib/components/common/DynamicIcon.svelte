<script lang="ts">
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
</script>

<span
    class="material-symbols-outlined {className}"
    style="font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; {customStyle}"
    >{name}</span
>
