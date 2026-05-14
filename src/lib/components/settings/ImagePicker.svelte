<script lang="ts">
    import { Button, TextField } from "$lib";
    import Upload from "~icons/material-symbols/upload";
    import Image from "~icons/material-symbols/image";
    import Delete from "~icons/material-symbols/delete";

    let {
        value = $bindable(),
        label = "Image",
        orientation = "landscape",
        onchange,
    } = $props();

    let fileInput: HTMLInputElement;

    let uploading = $state(false);
    let errorMessage = $state("");

    async function handleFile(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            const file = target.files[0];
            uploading = true;
            errorMessage = "";

            try {
                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: file,
                    headers: {
                        "x-filename": encodeURIComponent(file.name),
                        "content-type": file.type,
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    value = data.url;
                    onchange?.();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    errorMessage =
                        errorData.error ||
                        `Upload failed with status ${res.status}`;
                    console.error("Upload failed:", errorMessage);
                }
            } catch (err) {
                errorMessage = "Network error or server unavailable";
                console.error("Upload error", err);
            } finally {
                uploading = false;
                // Reset input to allow re-uploading the same file
                target.value = "";
            }
        }
    }

    function triggerUpload() {
        fileInput.click();
    }

    function clear() {
        value = "";
    }
</script>

<div class="flex flex-col gap-2">
    <span class="text-m3-label-large text-m3-on-surface">{label}</span>

    <div class="flex items-start gap-4">
        <!-- Preview -->
        <div
            class="relative group bg-m3-surface-container-high border border-m3-outline-variant rounded-lg overflow-hidden flex-shrink-0
            {orientation === 'landscape'
                ? 'w-48 h-28'
                : 'w-28 h-48'} flex items-center justify-center"
        >
            {#if value}
                <img
                    src={value}
                    alt="Preview"
                    class="w-full h-full object-cover"
                />
                <button
                    onclick={clear}
                    class="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                >
                    <Delete class="w-5 h-5" />
                </button>
            {:else}
                <Image class="w-8 h-8 text-m3-on-surface-variant opacity-50" />
            {/if}

            {#if uploading}
                <div
                    class="absolute inset-0 bg-black/40 flex items-center justify-center"
                >
                    <div
                        class="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"
                    ></div>
                </div>
            {/if}
        </div>

        <!-- Controls -->
        <div class="flex-1 flex flex-col gap-3">
            <TextField label="Image URL" placeholder="https://..." bind:value />

            <div class="flex flex-col gap-2">
                <input
                    type="file"
                    accept="image/*"
                    class="hidden"
                    bind:this={fileInput}
                    onchange={handleFile}
                />

                <div class="flex gap-2">
                    <Button
                        variant="tonal"
                        onclick={triggerUpload}
                        icon={Upload}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                </div>

                {#if errorMessage}
                    <p class="text-m3-error text-m3-body-small px-1">
                        {errorMessage}
                    </p>
                {/if}
            </div>
            <p class="text-m3-body-small text-m3-on-surface-variant">
                Upload a local file (saved to local functionality) or paste a
                URL.
            </p>
        </div>
    </div>
</div>
