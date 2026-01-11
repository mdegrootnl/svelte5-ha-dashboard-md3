<script lang="ts">
    import {
        themeStore,
        Button,
        FAB,
        Card,
        TextField,
        Chip,
        Switch,
        Checkbox,
        Radio,
    } from "$lib";
    import PageShell from "$lib/components/layout/PageShell.svelte";

    // Icons
    import Settings from "~icons/material-symbols/settings";
    import Add from "~icons/material-symbols/add";
    import Edit from "~icons/material-symbols/edit";
    import Favorite from "~icons/material-symbols/favorite";
    import Share from "~icons/material-symbols/share";
    import Search from "~icons/material-symbols/search";
    import Check from "~icons/material-symbols/check";
    import Close from "~icons/material-symbols/close";
    import ImageIcon from "~icons/material-symbols/image";

    let radioValue = $state("option1");
    let check1 = $state(true);
    let check2 = $state(false);
    let switch1 = $state(true);
    let textFieldValue = $state("");

    // Chips selection
    let filterSelected = $state(false);
    let imagePreview = $state<string | null>(null);

    async function handleImageUpload(e: Event) {
        const input = e.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = async (e) => {
                if (e.target?.result) {
                    imagePreview = e.target.result as string;
                    // Create image element to pass to MCU
                    const img = document.createElement("img");
                    img.src = imagePreview;
                    await img.decode(); // Wait for load
                    await themeStore.setSourceFromImage(img);
                }
            };
            reader.readAsDataURL(file);
        }
    }
    // Tooltip Action
    function tooltip(node: HTMLElement, text: string) {
        let tooltipComponent: HTMLDivElement | null = null;

        function handleMouseEnter(event: MouseEvent) {
            if (tooltipComponent) return;

            tooltipComponent = document.createElement("div");
            tooltipComponent.textContent = text;
            tooltipComponent.style.position = "fixed";
            tooltipComponent.style.background = "#333";
            tooltipComponent.style.color = "#fff";
            tooltipComponent.style.padding = "4px 8px";
            tooltipComponent.style.borderRadius = "4px";
            tooltipComponent.style.fontSize = "12px";
            tooltipComponent.style.zIndex = "1000";
            tooltipComponent.style.pointerEvents = "none";

            // Calculate position
            const rect = node.getBoundingClientRect();
            tooltipComponent.style.top = `${rect.bottom + 5}px`;
            tooltipComponent.style.left = `${rect.left + rect.width / 2}px`;
            tooltipComponent.style.transform = "translateX(-50%)";

            document.body.appendChild(tooltipComponent);
        }

        function handleMouseLeave() {
            if (tooltipComponent && document.body.contains(tooltipComponent)) {
                document.body.removeChild(tooltipComponent);
                tooltipComponent = null;
            }
        }

        node.addEventListener("mouseenter", handleMouseEnter);
        node.addEventListener("mouseleave", handleMouseLeave);

        return {
            destroy() {
                node.removeEventListener("mouseenter", handleMouseEnter);
                node.removeEventListener("mouseleave", handleMouseLeave);
                if (
                    tooltipComponent &&
                    document.body.contains(tooltipComponent)
                ) {
                    document.body.removeChild(tooltipComponent);
                    tooltipComponent = null;
                }
            },
            update(newText: string) {
                text = newText;
                if (tooltipComponent) {
                    tooltipComponent.textContent = text;
                }
            },
        };
    }
</script>

<div class="flex h-full w-full overflow-hidden bg-m3-surface">
    <!-- SIDEBAR: Configuration -->
    <aside
        class="w-80 flex-shrink-0 border-r border-m3-outline-variant bg-m3-surface-container-low overflow-y-auto p-6 flex flex-col gap-8"
    >
        <header>
            <h2 class="text-m3-headline-small text-m3-on-surface mb-2">
                Theme Builder
            </h2>
            <p class="text-m3-body-medium text-m3-on-surface-variant">
                Customize your Material Design 3 theme.
            </p>
        </header>

        <!-- Source Image -->
        <section class="flex flex-col gap-3">
            <span class="text-m3-label-large text-m3-on-surface"
                >Source Image</span
            >
            <div
                class="relative w-full aspect-video bg-m3-surface-container-highest rounded-m3-md overflow-hidden flex items-center justify-center cursor-pointer group border border-m3-outline-variant hover:border-m3-primary transition-colors"
                use:tooltip={"m3-surface-container-highest"}
            >
                <input
                    type="file"
                    accept="image/*"
                    onchange={handleImageUpload}
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {#if imagePreview}
                    <img
                        src={imagePreview}
                        alt="Source"
                        class="w-full h-full object-cover"
                    />
                    <div
                        class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <span class="text-white text-m3-label-medium"
                            >Change</span
                        >
                    </div>
                {:else}
                    <div
                        class="flex flex-col items-center gap-1 text-m3-on-surface-variant group-hover:text-m3-primary transition-colors"
                    >
                        <ImageIcon class="w-8 h-8" />
                        <span class="text-m3-label-small">Upload</span>
                    </div>
                {/if}
            </div>
        </section>

        <!-- Source Color -->
        <section class="flex flex-col gap-3">
            <span class="text-m3-label-large text-m3-on-surface"
                >Source Color</span
            >
            <div class="flex items-center gap-4">
                <input
                    type="color"
                    value={themeStore.sourceColor}
                    onchange={(e) =>
                        themeStore.setSourceColor(e.currentTarget.value)}
                    class="w-12 h-12 rounded-full cursor-pointer border-none bg-transparent p-0"
                />
                <span class="text-m3-body-large text-m3-on-surface font-mono"
                    >{themeStore.sourceColor}</span
                >
            </div>
        </section>

        <!-- Mode -->
        <section class="flex items-center justify-between">
            <span class="text-m3-label-large text-m3-on-surface">Dark Mode</span
            >
            <Switch
                checked={themeStore.isDark}
                onchange={() => themeStore.toggleDark()}
            />
        </section>

        <!-- Core Palette Visualization (Mini) -->
        <section class="flex flex-col gap-2">
            <span class="text-m3-label-large text-m3-on-surface"
                >Core Palette</span
            >
            <div class="grid grid-cols-4 gap-2 h-16">
                <div
                    class="bg-m3-primary h-full rounded-md"
                    use:tooltip={"m3-primary"}
                ></div>
                <div
                    class="bg-m3-secondary h-full rounded-md"
                    use:tooltip={"m3-secondary"}
                ></div>
                <div
                    class="bg-m3-tertiary h-full rounded-md"
                    use:tooltip={"m3-tertiary"}
                ></div>
                <div
                    class="bg-m3-error h-full rounded-md"
                    use:tooltip={"m3-error"}
                ></div>
            </div>
        </section>
    </aside>

    <PageShell
        title="Component Gallery"
        description="Live preview of all MD3 components with the generated theme."
        maxWidth="4xl"
    >
        <!-- BUTTONS -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">Buttons</h3>
            <div class="flex flex-wrap gap-4 items-center">
                <div use:tooltip={"m3-primary"}>
                    <Button variant="filled" onclick={() => {}}>Filled</Button>
                </div>
                <div use:tooltip={"m3-secondary-container"}>
                    <Button variant="tonal" onclick={() => {}}>Tonal</Button>
                </div>
                <div use:tooltip={"m3-surface-container-low"}>
                    <Button variant="elevated" onclick={() => {}}
                        >Elevated</Button
                    >
                </div>
                <div use:tooltip={"m3-outline"}>
                    <Button variant="outlined" onclick={() => {}}
                        >Outlined</Button
                    >
                </div>
                <div use:tooltip={"m3-primary (text)"}>
                    <Button variant="text" onclick={() => {}}>Text</Button>
                </div>
            </div>
            <!-- With Icons -->
            <div class="flex flex-wrap gap-4 items-center">
                <Button variant="filled" icon={Add}>Create</Button>
                <Button variant="tonal" icon={Edit}>Edit</Button>
                <Button variant="text" icon={Settings}>Settings</Button>
            </div>
        </section>

        <!-- FABs -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">
                Floating Action Buttons
            </h3>
            <div class="flex flex-wrap items-end gap-6">
                <div use:tooltip={"m3-primary-container"}>
                    <FAB variant="primary" size="small" icon={Add} />
                </div>
                <div use:tooltip={"m3-primary-container"}>
                    <FAB variant="primary" size="standard" icon={Add} />
                </div>
                <div use:tooltip={"m3-primary-container"}>
                    <FAB variant="primary" size="large" icon={Add} />
                </div>
                <div use:tooltip={"m3-tertiary-container"}>
                    <FAB variant="tertiary" size="standard" icon={Edit} />
                </div>
                <!-- Extended -->
                <div use:tooltip={"m3-secondary-container"}>
                    <FAB variant="secondary" icon={Add} label={snippetLabel} />
                </div>
            </div>
        </section>

        <!-- CARDS -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">Cards</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div use:tooltip={"m3-surface-container-low"}>
                    <Card variant="elevated" class="w-full">
                        <div class="p-6 flex flex-col gap-2">
                            <h4 class="text-m3-title-medium text-m3-on-surface">
                                Elevated Card
                            </h4>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Surface Container Low + Shadow.
                            </p>
                        </div>
                    </Card>
                </div>
                <div use:tooltip={"m3-surface-container-highest"}>
                    <Card variant="filled" class="w-full">
                        <div class="p-6 flex flex-col gap-2">
                            <h4 class="text-m3-title-medium text-m3-on-surface">
                                Filled Card
                            </h4>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Surface Container Highest.
                            </p>
                        </div>
                    </Card>
                </div>
                <div use:tooltip={"m3-outline-variant"}>
                    <Card variant="outlined" class="w-full">
                        <div class="p-6 flex flex-col gap-2">
                            <h4 class="text-m3-title-medium text-m3-on-surface">
                                Outlined Card
                            </h4>
                            <p
                                class="text-m3-body-medium text-m3-on-surface-variant"
                            >
                                Surface + Outline Border.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </section>

        <!-- INPUTS -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">Text Fields</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <TextField
                    label="Filled"
                    placeholder="Enter text..."
                    bind:value={textFieldValue}
                    leadingIcon={Search}
                    supportingText="Supporting text goes here"
                />
                <TextField
                    variant="outlined"
                    label="Outlined"
                    placeholder="Enter text..."
                    bind:value={textFieldValue}
                    trailingIcon={Close}
                />
                <TextField
                    label="Error State"
                    value="Invalid Input"
                    error={true}
                    supportingText="Error message"
                />
            </div>
        </section>

        <!-- CHIPS -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">Chips</h3>
            <div class="flex flex-wrap gap-4">
                <Chip label="Assist" icon={Favorite} />
                <Chip
                    variant="filter"
                    label="Filter"
                    selected={filterSelected}
                    onclick={() => (filterSelected = !filterSelected)}
                />
                <Chip variant="input" label="Input" onclose={() => {}} />
                <Chip variant="suggestion" label="Suggestion" />
            </div>
        </section>

        <!-- SELECTION CONTROLS -->
        <section class="space-y-4">
            <h3 class="text-m3-title-medium text-m3-on-surface">
                Selection Controls
            </h3>
            <div
                class="flex flex-col gap-4 p-6 bg-m3-surface-container rounded-xl max-w-md"
            >
                <div class="flex items-center justify-between">
                    <span class="text-m3-body-large text-m3-on-surface"
                        >Switch</span
                    >
                    <Switch bind:checked={switch1} />
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-m3-body-large text-m3-on-surface"
                        >Checkbox</span
                    >
                    <div class="flex gap-4">
                        <Checkbox bind:checked={check1} />
                        <Checkbox bind:checked={check2} />
                        <Checkbox indeterminate />
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="text-m3-body-large text-m3-on-surface"
                        >Radio</span
                    >
                    <div class="flex gap-4">
                        <Radio bind:group={radioValue} value="option1" />
                        <Radio bind:group={radioValue} value="option2" />
                    </div>
                </div>
            </div>
        </section>
    </PageShell>
</div>

{#snippet snippetLabel()}
    Create
{/snippet}
