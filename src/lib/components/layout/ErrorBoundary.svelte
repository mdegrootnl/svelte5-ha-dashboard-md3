<script lang="ts">
    import { type Snippet } from "svelte";
    import IconError from "~icons/material-symbols/error";

    interface Props {
        children: Snippet;
        fallback?: Snippet<[Error]>;
    }

    let { children, fallback }: Props = $props();

    let error = $state<Error | null>(null);

    function handleError(event: any) {
        error = event.error || new Error(event.message || "Unknown error");
    }
</script>

<svelte:window onerror={handleError} />

{#if error}
    {#if fallback}
        {@render fallback(error)}
    {:else}
        <div
            class="p-6 bg-m3-error-container text-m3-on-error-container rounded-m3-md flex items-center gap-4"
        >
            <IconError class="w-6 h-6 shrink-0" />
            <div>
                <p class="font-medium">Something went wrong</p>
                <p class="text-sm opacity-80">{error.message}</p>
            </div>
        </div>
    {/if}
{:else}
    {@render children()}
{/if}
