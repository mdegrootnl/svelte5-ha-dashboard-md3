<script lang="ts">
    import { onDestroy } from "svelte";
    import { haStore } from "$lib/stores/ha.svelte";

    interface Props {
        src: string | null | undefined;
        alt?: string;
        class?: string;
        style?: string;
    }

    let {
        src,
        alt = "",
        class: className = "",
        style = "",
    }: Props = $props();

    let resolvedSrc = $state<string | null>(null);
    let objectUrl: string | null = null;

    function revokeObjectUrl() {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
        }
    }

    $effect(() => {
        const source = src;
        let cancelled = false;

        resolvedSrc = null;
        revokeObjectUrl();

        if (!source) return;

        haStore
            .fetchProxiedBlobUrl(source)
            .then((url) => {
                if (cancelled) {
                    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
                    return;
                }

                objectUrl = url?.startsWith("blob:") ? url : null;
                resolvedSrc = url;
            })
            .catch(() => {
                if (!cancelled) resolvedSrc = null;
            });

        return () => {
            cancelled = true;
            revokeObjectUrl();
        };
    });

    onDestroy(revokeObjectUrl);
</script>

{#if resolvedSrc}
    <img src={resolvedSrc} {alt} class={className} {style} />
{/if}
