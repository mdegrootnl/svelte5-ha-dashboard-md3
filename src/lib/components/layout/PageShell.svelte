<script lang="ts">
    import { type Snippet } from "svelte";

    interface Props {
        title: string;
        description?: string;
        maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "full"; // Added "full"
        children: Snippet;
        actions?: Snippet;
    }

    let {
        title,
        description,
        maxWidth = "full", // Changed default from "2xl" to "full"
        children,
        actions,
    }: Props = $props();

    const widthClasses: Record<string, string> = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        "2xl": "max-w-2xl",
        "4xl": "max-w-4xl",
        "6xl": "max-w-6xl",
        full: "max-w-full", // Added "full" class
    };
</script>

<div class="h-full w-full bg-m3-surface overflow-y-auto p-8">
    <div class="{widthClasses[maxWidth]} mx-auto flex flex-col gap-8">
        <header class="flex items-start justify-between">
            <div>
                <h1 class="text-m3-display-small text-m3-on-surface">
                    {title}
                </h1>
                {#if description}
                    <p
                        class="text-m3-body-large text-m3-on-surface-variant mt-2"
                    >
                        {description}
                    </p>
                {/if}
            </div>
            {#if actions}
                <div class="flex items-center gap-2">
                    {@render actions()}
                </div>
            {/if}
        </header>
        {@render children()}
    </div>
</div>
