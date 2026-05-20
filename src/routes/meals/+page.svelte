<script lang="ts">
    import { onMount } from "svelte";
    import PageShell from "$lib/components/layout/PageShell.svelte";
    import Card from "$lib/components/md3/Card.svelte";
    import Button from "$lib/components/md3/Button.svelte";
    import Checkbox from "$lib/components/md3/Checkbox.svelte";
    import TextField from "$lib/components/md3/TextField.svelte";
    import { themeStore } from "$lib/stores/theme.svelte";
    import { withBase } from "$lib/utils/appBase";
    import { parseRecipeImportUrls } from "$lib/features/meals/importUrls";
    import {
        normalizeServings,
        scaleIngredientQuantity,
        scaleIngredientText,
        servingScale,
    } from "$lib/features/meals/servings";
    import type {
        MealiePagination,
        MealiePlanEntry,
        MealiePlanEntryType,
        MealieRecipe,
        MealieRecipeSummary,
        MealieShoppingList,
        MealieShoppingListItem,
    } from "$lib/types/mealie";

    import Restaurant from "~icons/material-symbols/restaurant";
    import Search from "~icons/material-symbols/search";
    import Refresh from "~icons/material-symbols/refresh";
    import Settings from "~icons/material-symbols/settings";
    import CalendarMonth from "~icons/material-symbols/calendar-month";
    import ShoppingCart from "~icons/material-symbols/shopping-cart";
    import Timer from "~icons/material-symbols/timer";
    import OpenInNew from "~icons/material-symbols/open-in-new";
    import Add from "~icons/material-symbols/add";
    import DeleteIcon from "~icons/material-symbols/delete";
    import UploadFile from "~icons/material-symbols/upload-file";

    type Tab = "today" | "planner" | "recipes" | "shopping";

    interface ImportResult {
        url: string;
        status: "pending" | "success" | "error";
        message: string;
    }

    interface MealieSettingsStatus {
        configured: boolean;
        baseUrl: string;
        tokenConfigured: boolean;
        source: "runtime" | "env" | "mixed" | "none";
    }

    let activeTab = $state<Tab>("today");
    let settings = $state<MealieSettingsStatus | null>(null);
    let loading = $state(true);
    let error = $state("");
    let recipeSearch = $state("");
    let recipes = $state<MealieRecipeSummary[]>([]);
    let selectedRecipe = $state<MealieRecipe | null>(null);
    let recipePeople = $state(4);
    let recipeShoppingListId = $state("");
    let recipeDetailMessage = $state("");
    let addingRecipeToShopping = $state(false);
    let brokenRecipeImageIds = $state<Record<string, boolean>>({});
    let todayEntries = $state<MealiePlanEntry[]>([]);
    let plannerEntries = $state<MealiePlanEntry[]>([]);
    let plannerStartDate = $state(toDateInput(new Date()));
    let planDate = $state(toDateInput(new Date()));
    let planEntryType = $state<MealiePlanEntryType>("dinner");
    let planTime = $state("18:00");
    let planPeople = $state(4);
    let planNote = $state("");
    let planRecipeId = $state("");
    let planningBusy = $state(false);
    let plannerMessage = $state("");
    let deletingPlanId = $state<number | null>(null);
    let importUrlsText = $state("");
    let importIncludeTags = $state(true);
    let importIncludeCategories = $state(true);
    let importingUrls = $state(false);
    let importMessage = $state("");
    let importResults = $state<ImportResult[]>([]);
    let shoppingLists = $state<MealieShoppingList[]>([]);
    let activeShoppingListId = $state("");
    let activeShoppingList = $state<MealieShoppingList | null>(null);
    let shoppingBusyItemId = $state("");

    const tabs = $derived([
        { id: "today", label: themeStore.t("meals.tabs.today"), icon: CalendarMonth },
        { id: "planner", label: themeStore.t("meals.tabs.planner"), icon: CalendarMonth },
        { id: "recipes", label: themeStore.t("meals.tabs.recipes"), icon: Restaurant },
        { id: "shopping", label: themeStore.t("meals.tabs.shopping"), icon: ShoppingCart },
    ]);

    const mealOrder = ["breakfast", "lunch", "dinner", "side", "snack", "drink", "dessert"];
    const mealTypes = mealOrder as MealiePlanEntryType[];
    const sortedTodayEntries = $derived(
        [...todayEntries].sort(
            (a, b) => mealOrder.indexOf(a.entryType) - mealOrder.indexOf(b.entryType),
        ),
    );
    const plannerEndDate = $derived(addDays(plannerStartDate, 6));
    const plannerDays = $derived(
        Array.from({ length: 7 }, (_, index) => addDays(plannerStartDate, index)),
    );
    const sortedPlannerEntries = $derived(
        [...plannerEntries].sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare) return dateCompare;
            return mealOrder.indexOf(a.entryType) - mealOrder.indexOf(b.entryType);
        }),
    );
    const selectedPlanRecipe = $derived(
        recipes.find((recipe) => recipe.id === planRecipeId) ?? null,
    );
    const selectedRecipeScale = $derived(servingScale(selectedRecipe?.recipeServings, recipePeople));
    const parsedImportUrls = $derived(parseRecipeImportUrls(importUrlsText));
    const activeShoppingItems = $derived(activeShoppingList?.listItems ?? []);
    const openShoppingItems = $derived(activeShoppingItems.filter((item) => !item.checked));
    const checkedShoppingItems = $derived(activeShoppingItems.filter((item) => item.checked));

    function toDateInput(date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function addDays(dateInput: string, days: number) {
        const [year, month, day] = dateInput.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + days);
        return toDateInput(date);
    }

    onMount(async () => {
        await loadInitial();
    });

    async function loadInitial() {
        loading = true;
        error = "";
        try {
            await loadSettings();
            if (settings?.configured) {
                await Promise.all([loadToday(), loadPlanner(), loadRecipes(), loadShoppingLists()]);
            }
        } catch (err) {
            error = err instanceof Error ? err.message : themeStore.t("meals.error.loadFailed");
        } finally {
            loading = false;
        }
    }

    async function loadSettings() {
        const response = await fetch("/api/mealie/settings");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || themeStore.t("meals.error.settings"));
        settings = data.settings;
    }

    async function mealieFetch<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`/api/mealie/${path}`, init);
        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
            ? await response.json().catch(() => ({}))
            : null;

        if (!response.ok) {
            throw new Error(formatApiError(data));
        }

        return data as T;
    }

    function formatApiError(data: unknown) {
        if (!data || typeof data !== "object") return themeStore.t("meals.error.request");
        const record = data as Record<string, unknown>;
        if (typeof record.error === "string") return record.error;
        if (typeof record.detail === "string") return record.detail;
        if (record.detail && typeof record.detail === "object") {
            const detail = record.detail as Record<string, unknown>;
            if (typeof detail.message === "string") return detail.message;
        }
        return themeStore.t("meals.error.request");
    }

    function paginationItems<T>(page: MealiePagination<T>) {
        return page.items ?? page.data ?? [];
    }

    async function loadToday() {
        todayEntries = await mealieFetch<MealiePlanEntry[]>("households/mealplans/today");
    }

    async function loadPlanner() {
        const params = new URLSearchParams({
            start_date: plannerStartDate,
            end_date: plannerEndDate,
            perPage: "-1",
            orderBy: "date",
            orderDirection: "asc",
        });
        const page = await mealieFetch<MealiePagination<MealiePlanEntry>>(
            `households/mealplans?${params.toString()}`,
        );
        plannerEntries = paginationItems(page);
    }

    async function loadRecipes() {
        const params = new URLSearchParams({
            page: "1",
            perPage: "24",
            orderBy: "name",
            orderDirection: "asc",
        });
        if (recipeSearch.trim()) params.set("search", recipeSearch.trim());
        const page = await mealieFetch<MealiePagination<MealieRecipeSummary>>(
            `recipes?${params.toString()}`,
        );
        recipes = paginationItems(page);
    }

    async function selectRecipe(recipe: MealieRecipeSummary) {
        const loaded = await mealieFetch<MealieRecipe>(`recipes/${recipe.slug}`);
        selectedRecipe = loaded;
        recipePeople = normalizeServings(loaded.recipeServings);
        recipeShoppingListId = activeShoppingListId || shoppingLists[0]?.id || "";
        recipeDetailMessage = "";
    }

    function entriesForDay(day: string) {
        return sortedPlannerEntries.filter((entry) => entry.date === day);
    }

    function formatDay(day: string) {
        return new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
        }).format(new Date(`${day}T12:00:00`));
    }

    function planEntryTitle(entry: MealiePlanEntry) {
        return entry.recipe?.name || entry.title || themeStore.t("meals.today.note");
    }

    function buildPlanText() {
        const note = planNote.trim();
        const time = planTime.trim();
        const people = planPeople ? themeStore.t("meals.planner.peopleNote", { count: planPeople }) : "";
        return [time, people, note].filter(Boolean).join(" - ");
    }

    function handlePlanRecipeChange() {
        const recipe = recipes.find((current) => current.id === planRecipeId);
        if (recipe) planPeople = normalizeServings(recipe.recipeServings);
    }

    async function createPlanEntry() {
        if (!planDate) {
            plannerMessage = themeStore.t("meals.planner.selectDate");
            return;
        }

        planningBusy = true;
        plannerMessage = "";
        try {
            const created = await mealieFetch<MealiePlanEntry>("households/mealplans", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    date: planDate,
                    entryType: planEntryType,
                    title: selectedPlanRecipe?.name ?? "",
                    text: buildPlanText(),
                    recipeId: selectedPlanRecipe?.id ?? null,
                }),
            });
            plannerEntries = [...plannerEntries, created];
            if (planDate === toDateInput(new Date())) await loadToday();
            plannerMessage = themeStore.t("meals.planner.saved");
            planNote = "";
        } catch (err) {
            plannerMessage = err instanceof Error ? err.message : themeStore.t("meals.planner.saveFailed");
        } finally {
            planningBusy = false;
        }
    }

    async function deletePlanEntry(entry: MealiePlanEntry) {
        deletingPlanId = entry.id;
        plannerMessage = "";
        try {
            await mealieFetch<MealiePlanEntry>(`households/mealplans/${entry.id}`, {
                method: "DELETE",
            });
            plannerEntries = plannerEntries.filter((current) => current.id !== entry.id);
            if (entry.date === toDateInput(new Date())) await loadToday();
            plannerMessage = themeStore.t("meals.planner.deleted");
        } catch (err) {
            plannerMessage = err instanceof Error ? err.message : themeStore.t("meals.planner.deleteFailed");
        } finally {
            deletingPlanId = null;
        }
    }

    async function importRecipeUrls() {
        const urls = parsedImportUrls;
        if (!urls.length) {
            importMessage = themeStore.t("meals.import.noUrls");
            return;
        }

        importingUrls = true;
        importMessage = "";
        importResults = urls.map((url) => ({
            url,
            status: "pending",
            message: themeStore.t("meals.import.pending"),
        }));

        for (const url of urls) {
            try {
                const result = await mealieFetch<string>("recipes/create/url", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        url,
                        includeTags: importIncludeTags,
                        includeCategories: importIncludeCategories,
                    }),
                });
                importResults = importResults.map((current) =>
                    current.url === url
                        ? {
                              ...current,
                              status: "success",
                              message: result || themeStore.t("meals.import.imported"),
                          }
                        : current,
                );
            } catch (err) {
                try {
                    const fallback = await mealieFetch<{
                        slug: string;
                        name: string;
                        source: string;
                        imageImported?: boolean;
                    }>(
                        "import/browser-url",
                        {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                                url,
                                includeTags: importIncludeTags,
                                includeCategories: importIncludeCategories,
                            }),
                        },
                    );
                    importResults = importResults.map((current) =>
                        current.url === url
                            ? {
                                  ...current,
                                  status: "success",
                                  message: themeStore.t(
                                      fallback.imageImported
                                          ? "meals.import.importedWithBrowserImage"
                                          : "meals.import.importedWithBrowser",
                                      {
                                          name: fallback.name || fallback.slug,
                                      },
                                  ),
                              }
                            : current,
                    );
                } catch (fallbackErr) {
                    const firstMessage =
                        err instanceof Error ? err.message : themeStore.t("meals.import.failed");
                    const fallbackMessage =
                        fallbackErr instanceof Error
                            ? fallbackErr.message
                            : themeStore.t("meals.import.failed");
                    importResults = importResults.map((current) =>
                        current.url === url
                            ? {
                                  ...current,
                                  status: "error",
                                  message: `${firstMessage}. ${themeStore.t("meals.import.browserFallbackFailed", { error: fallbackMessage })}`,
                              }
                            : current,
                    );
                }
            }

            if (urls.indexOf(url) < urls.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        }

        await loadRecipes();
        importingUrls = false;
        importMessage = themeStore.t("meals.import.finished");
    }

    async function loadShoppingLists() {
        const page = await mealieFetch<MealiePagination<MealieShoppingList>>(
            "households/shopping/lists?perPage=20&orderBy=name&orderDirection=asc",
        );
        shoppingLists = paginationItems(page);
        if (!activeShoppingListId && shoppingLists[0]) {
            activeShoppingListId = shoppingLists[0].id;
        }
        if (activeShoppingListId) {
            await loadShoppingList(activeShoppingListId);
        }
    }

    async function loadShoppingList(id: string) {
        activeShoppingListId = id;
        activeShoppingList = await mealieFetch<MealieShoppingList>(
            `households/shopping/lists/${id}`,
        );
    }

    async function setShoppingItemChecked(item: MealieShoppingListItem, checked: boolean) {
        shoppingBusyItemId = item.id;
        try {
            const updated = await mealieFetch<MealieShoppingListItem>(
                `households/shopping/items/${item.id}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        ...item,
                        checked,
                        shoppingListId: item.shoppingListId,
                    }),
                },
            );
            activeShoppingList = {
                ...activeShoppingList!,
                listItems: activeShoppingItems.map((current) =>
                    current.id === item.id ? updated : current,
                ),
            };
        } finally {
            shoppingBusyItemId = "";
        }
    }

    function recipeImageUrl(recipe: MealieRecipeSummary | null | undefined) {
        if (!recipe?.id || brokenRecipeImageIds[recipe.id]) return "";
        return withBase(`/api/mealie/media/recipes/${recipe.id}/images/min-original.webp`);
    }

    function markRecipeImageBroken(recipe: MealieRecipeSummary | null | undefined) {
        if (!recipe?.id) return;
        brokenRecipeImageIds = { ...brokenRecipeImageIds, [recipe.id]: true };
    }

    function formatDuration(value: string | null | undefined) {
        if (!value) return "";
        const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/);
        if (!match) return value;
        const hours = Number(match[1] ?? 0);
        const minutes = Number(match[2] ?? 0);
        if (hours && minutes) return `${hours}h ${minutes}m`;
        if (hours) return `${hours}h`;
        return `${minutes}m`;
    }

    function mealLabel(type: string) {
        return themeStore.t(`meals.mealTypes.${type}`);
    }

    function recipeMeta(recipe: MealieRecipeSummary) {
        return [
            formatDuration(recipe.totalTime),
            recipe.recipeYield ||
                (recipe.recipeServings
                    ? themeStore.t("meals.recipes.servings", { count: recipe.recipeServings })
                    : ""),
        ].filter(Boolean).join(" · ");
    }

    function itemLabel(item: MealieShoppingListItem) {
        return item.display || item.food?.name || item.note || themeStore.t("meals.shopping.unnamedItem");
    }

    function ingredientBaseText(ingredient: NonNullable<MealieRecipe["recipeIngredient"]>[number]) {
        return ingredient.display || ingredient.note || ingredient.food?.name || "";
    }

    function scaledIngredientDisplay(ingredient: NonNullable<MealieRecipe["recipeIngredient"]>[number]) {
        const display = ingredientBaseText(ingredient);
        if (!display) return "";
        return scaleIngredientText(display, selectedRecipeScale);
    }

    function scaledRecipeIngredients(recipe: MealieRecipe) {
        const scale = servingScale(recipe.recipeServings, recipePeople);
        return (recipe.recipeIngredient ?? []).map((ingredient) => {
            const display = scaleIngredientText(ingredientBaseText(ingredient), scale);
            const note = scaleIngredientText(ingredient.note || ingredient.display || "", scale);
            return {
                ...ingredient,
                quantity: scaleIngredientQuantity(ingredient.quantity, scale),
                display,
                note: note || display,
            };
        });
    }

    async function addSelectedRecipeToShoppingList() {
        if (!selectedRecipe?.id) return;
        if (!recipeShoppingListId) {
            recipeDetailMessage = themeStore.t("meals.recipes.noShoppingList");
            return;
        }

        addingRecipeToShopping = true;
        recipeDetailMessage = "";
        try {
            const updated = await mealieFetch<MealieShoppingList>(
                `households/shopping/lists/${recipeShoppingListId}/recipe`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify([
                        {
                            recipeId: selectedRecipe.id,
                            recipeIncrementQuantity: 1,
                            recipeIngredients: scaledRecipeIngredients(selectedRecipe),
                        },
                    ]),
                },
            );
            activeShoppingListId = recipeShoppingListId;
            activeShoppingList = updated;
            recipeDetailMessage = themeStore.t("meals.recipes.addedToShopping", { count: recipePeople });
        } catch (err) {
            recipeDetailMessage = err instanceof Error ? err.message : themeStore.t("meals.error.request");
        } finally {
            addingRecipeToShopping = false;
        }
    }

    function openMealie() {
        if (!settings?.baseUrl) return;
        window.open(settings.baseUrl, "_blank", "noopener,noreferrer");
    }
</script>

<PageShell title={themeStore.t("meals.title")} description={themeStore.t("meals.description")}>
    {#if loading}
        <div class="flex h-full items-center justify-center p-8">
            <div class="flex items-center gap-3 text-m3-on-surface-variant">
                <Refresh class="size-6 animate-spin" />
                <span class="text-m3-body-large">{themeStore.t("common.loading")}</span>
            </div>
        </div>
    {:else if !settings?.configured}
        <div class="flex h-full items-center justify-center p-4">
            <Card variant="outlined" class="max-w-xl w-full">
                <div class="p-6 flex flex-col gap-5">
                    <div class="flex items-center gap-4">
                        <div class="size-14 rounded-full bg-m3-tertiary-container flex items-center justify-center">
                            <Restaurant class="size-7 text-m3-on-tertiary-container" />
                        </div>
                        <div>
                            <h2 class="text-m3-title-large text-m3-on-surface">
                                {themeStore.t("meals.notConfigured.title")}
                            </h2>
                            <p class="text-m3-body-medium text-m3-on-surface-variant">
                                {themeStore.t("meals.notConfigured.description")}
                            </p>
                        </div>
                    </div>
                    {#if error}
                        <p class="text-m3-body-medium text-m3-error">{error}</p>
                    {/if}
                    <div class="flex justify-end">
                        <a
                            href={withBase("/settings")}
                            class="touch-target inline-flex items-center justify-center gap-2 px-6 rounded-full text-m3-label-large font-medium bg-m3-primary text-m3-on-primary hover:bg-m3-primary/92 transition-colors"
                        >
                            <Settings class="size-5" />
                            {themeStore.t("common.openSettings")}
                        </a>
                    </div>
                </div>
            </Card>
        </div>
    {:else}
        <div class="flex h-full flex-col gap-4">
            <div class="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-center">
                <nav class="flex gap-1 overflow-x-auto">
                    {#each tabs as tab}
                        {@const Icon = tab.icon}
                        <button
                            class="touch-target inline-flex items-center gap-2 rounded-full px-4 text-m3-label-large font-medium transition-colors whitespace-nowrap
                                {activeTab === tab.id
                                ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                : 'text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                            onclick={() => (activeTab = tab.id as Tab)}
                        >
                            <Icon class="size-5" />
                            {tab.label}
                        </button>
                    {/each}
                </nav>

                <div class="flex-1"></div>

                <div class="flex gap-2">
                    <Button variant="outlined" onclick={loadInitial} icon={Refresh}>
                        {themeStore.t("common.refresh")}
                    </Button>
                    <Button variant="text" onclick={openMealie} icon={OpenInNew}>
                        Mealie
                    </Button>
                </div>
            </div>

            {#if error}
                <div class="px-4">
                    <div class="rounded-lg border border-m3-error/30 bg-m3-error-container/40 p-4 text-m3-on-error-container">
                        {error}
                    </div>
                </div>
            {/if}

            <div class="flex-1 overflow-auto px-4 pb-24">
                {#if activeTab === "today"}
                    {#if sortedTodayEntries.length}
                        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            {#each sortedTodayEntries as entry (entry.id)}
                                <Card variant="outlined">
                                    <div class="grid min-h-44 grid-cols-[128px_1fr] overflow-hidden sm:grid-cols-[180px_1fr]">
                                        <div class="bg-m3-surface-container-high">
                                            {#if recipeImageUrl(entry.recipe)}
                                                <img
                                                    src={recipeImageUrl(entry.recipe)}
                                                    alt={entry.recipe?.name ?? entry.title ?? mealLabel(entry.entryType)}
                                                    class="h-full w-full object-cover"
                                                    onerror={() => markRecipeImageBroken(entry.recipe)}
                                                />
                                            {:else}
                                                <div class="flex h-full items-center justify-center">
                                                    <Restaurant class="size-12 text-m3-on-surface-variant" />
                                                </div>
                                            {/if}
                                        </div>
                                        <div class="flex flex-col justify-center gap-3 p-5">
                                            <span class="w-fit rounded-full bg-m3-secondary-container px-3 py-1 text-m3-label-medium text-m3-on-secondary-container">
                                                {mealLabel(entry.entryType)}
                                            </span>
                                            <div>
                                                <h2 class="line-clamp-2 text-m3-title-large text-m3-on-surface">
                                                    {entry.recipe?.name || entry.title || themeStore.t("meals.today.note")}
                                                </h2>
                                                {#if entry.text}
                                                    <p class="mt-1 line-clamp-2 text-m3-body-medium text-m3-on-surface-variant">
                                                        {entry.text}
                                                    </p>
                                                {/if}
                                            </div>
                                            {#if entry.recipe}
                                                <Button variant="text" onclick={() => selectRecipe(entry.recipe!)} icon={Restaurant}>
                                                    {themeStore.t("meals.recipes.viewRecipe")}
                                                </Button>
                                            {/if}
                                        </div>
                                    </div>
                                </Card>
                            {/each}
                        </div>
                    {:else}
                        <div class="flex h-full items-center justify-center p-8 text-center text-m3-on-surface-variant">
                            {themeStore.t("meals.today.empty")}
                        </div>
                    {/if}
                {:else if activeTab === "planner"}
                    <div class="grid grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
                        <Card variant="outlined">
                            <div class="flex flex-col gap-4 p-5">
                                <div>
                                    <h2 class="text-m3-title-large text-m3-on-surface">
                                        {themeStore.t("meals.planner.addTitle")}
                                    </h2>
                                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                                        {themeStore.t("meals.planner.addDescription")}
                                    </p>
                                </div>

                                <label class="flex flex-col gap-1">
                                    <span class="text-m3-label-large text-m3-on-surface-variant">
                                        {themeStore.t("meals.planner.date")}
                                    </span>
                                    <input
                                        type="date"
                                        bind:value={planDate}
                                        class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                    />
                                </label>

                                <label class="flex flex-col gap-1">
                                    <span class="text-m3-label-large text-m3-on-surface-variant">
                                        {themeStore.t("meals.planner.meal")}
                                    </span>
                                    <select
                                        bind:value={planEntryType}
                                        class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                    >
                                        {#each mealTypes as type}
                                            <option value={type}>{mealLabel(type)}</option>
                                        {/each}
                                    </select>
                                </label>

                                <label class="flex flex-col gap-1">
                                    <span class="text-m3-label-large text-m3-on-surface-variant">
                                        {themeStore.t("meals.planner.recipe")}
                                    </span>
                                    <select
                                        bind:value={planRecipeId}
                                        onchange={handlePlanRecipeChange}
                                        class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                    >
                                        <option value="">{themeStore.t("meals.planner.noRecipe")}</option>
                                        {#each recipes.filter((recipe) => recipe.id) as recipe (recipe.id)}
                                            <option value={recipe.id}>{recipe.name}</option>
                                        {/each}
                                    </select>
                                </label>

                                <div class="grid grid-cols-1 gap-3 sm:grid-cols-[120px_120px_1fr]">
                                    <label class="flex flex-col gap-1">
                                        <span class="text-m3-label-large text-m3-on-surface-variant">
                                            {themeStore.t("meals.planner.time")}
                                        </span>
                                        <input
                                            type="time"
                                            bind:value={planTime}
                                            class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                        />
                                    </label>
                                    <label class="flex flex-col gap-1">
                                        <span class="text-m3-label-large text-m3-on-surface-variant">
                                            {themeStore.t("meals.planner.people")}
                                        </span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            bind:value={planPeople}
                                            class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                        />
                                    </label>
                                    <TextField
                                        label={themeStore.t("meals.planner.note")}
                                        bind:value={planNote}
                                    />
                                </div>

                                {#if plannerMessage}
                                    <p class="text-m3-body-small text-m3-on-surface-variant">
                                        {plannerMessage}
                                    </p>
                                {/if}

                                <Button
                                    variant="filled"
                                    onclick={createPlanEntry}
                                    disabled={planningBusy}
                                    icon={Add}
                                >
                                    {planningBusy ? themeStore.t("common.saving") : themeStore.t("meals.planner.add")}
                                </Button>
                            </div>
                        </Card>

                        <div class="flex flex-col gap-4">
                            <div class="flex flex-col gap-3 md:flex-row md:items-center">
                                <label class="flex flex-col gap-1">
                                    <span class="text-m3-label-large text-m3-on-surface-variant">
                                        {themeStore.t("meals.planner.weekStart")}
                                    </span>
                                    <input
                                        type="date"
                                        bind:value={plannerStartDate}
                                        onchange={loadPlanner}
                                        class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                    />
                                </label>
                                <div class="flex-1"></div>
                                <Button variant="outlined" onclick={loadPlanner} icon={Refresh}>
                                    {themeStore.t("common.refresh")}
                                </Button>
                            </div>

                            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                                {#each plannerDays as day}
                                    {@const dayEntries = entriesForDay(day)}
                                    <Card variant="outlined">
                                        <div class="flex min-h-52 flex-col gap-3 p-4">
                                            <h2 class="text-m3-title-medium text-m3-on-surface">
                                                {formatDay(day)}
                                            </h2>
                                            {#if dayEntries.length}
                                                <div class="flex flex-col gap-2">
                                                    {#each dayEntries as entry (entry.id)}
                                                        <div class="rounded-lg bg-m3-surface-container p-3">
                                                            <div class="mb-1 flex items-start gap-2">
                                                                <span class="rounded-full bg-m3-secondary-container px-2 py-0.5 text-m3-label-medium text-m3-on-secondary-container">
                                                                    {mealLabel(entry.entryType)}
                                                                </span>
                                                                <button
                                                                    class="ml-auto flex size-9 items-center justify-center rounded-full text-m3-on-surface-variant hover:bg-m3-surface-container-highest"
                                                                    aria-label={themeStore.t("meals.planner.delete")}
                                                                    disabled={deletingPlanId === entry.id}
                                                                    onclick={() => deletePlanEntry(entry)}
                                                                >
                                                                    <DeleteIcon class="size-5" />
                                                                </button>
                                                            </div>
                                                            <div class="text-m3-body-large font-medium text-m3-on-surface">
                                                                {planEntryTitle(entry)}
                                                            </div>
                                                            {#if entry.text}
                                                                <div class="mt-1 text-m3-body-small text-m3-on-surface-variant">
                                                                    {entry.text}
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    {/each}
                                                </div>
                                            {:else}
                                                <div class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-m3-outline-variant p-4 text-center text-m3-body-medium text-m3-on-surface-variant">
                                                    {themeStore.t("meals.planner.emptyDay")}
                                                </div>
                                            {/if}
                                        </div>
                                    </Card>
                                {/each}
                            </div>
                        </div>
                    </div>
                {:else if activeTab === "recipes"}
                    <Card variant="outlined" class="mb-4">
                        <div class="flex flex-col gap-4 p-5">
                            <div class="flex items-start gap-4">
                                <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-m3-tertiary-container">
                                    <UploadFile class="size-6 text-m3-on-tertiary-container" />
                                </div>
                                <div class="flex-1">
                                    <h2 class="text-m3-title-large text-m3-on-surface">
                                        {themeStore.t("meals.import.title")}
                                    </h2>
                                    <p class="text-m3-body-medium text-m3-on-surface-variant">
                                        {themeStore.t("meals.import.description")}
                                    </p>
                                </div>
                            </div>

                            <textarea
                                bind:value={importUrlsText}
                                rows="5"
                                placeholder="https://miljuschka.nl/pasta-alfredo/"
                                class="min-h-32 w-full resize-y rounded-md border border-m3-outline bg-m3-surface p-4 text-m3-body-large text-m3-on-surface outline-none focus:border-2 focus:border-m3-primary"
                            ></textarea>

                            <div class="flex flex-wrap items-center gap-3">
                                <label class="flex min-h-11 items-center gap-2 rounded-full bg-m3-surface-container px-3 text-m3-label-large text-m3-on-surface">
                                    <Checkbox bind:checked={importIncludeTags} />
                                    {themeStore.t("meals.import.includeTags")}
                                </label>
                                <label class="flex min-h-11 items-center gap-2 rounded-full bg-m3-surface-container px-3 text-m3-label-large text-m3-on-surface">
                                    <Checkbox bind:checked={importIncludeCategories} />
                                    {themeStore.t("meals.import.includeCategories")}
                                </label>
                                <span class="text-m3-body-small text-m3-on-surface-variant">
                                    {themeStore.t("meals.import.detected", { count: parsedImportUrls.length })}
                                </span>
                                <div class="flex-1"></div>
                                <Button
                                    variant="filled"
                                    onclick={importRecipeUrls}
                                    disabled={importingUrls || parsedImportUrls.length === 0}
                                    icon={UploadFile}
                                >
                                    {importingUrls ? themeStore.t("meals.import.importing") : themeStore.t("meals.import.start")}
                                </Button>
                            </div>

                            {#if importMessage}
                                <p class="text-m3-body-small text-m3-on-surface-variant">
                                    {importMessage}
                                </p>
                            {/if}

                            {#if importResults.length}
                                <div class="grid gap-2">
                                    {#each importResults as result (result.url)}
                                        <div
                                            class="rounded-lg p-3 text-m3-body-small
                                                {result.status === 'success'
                                                ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                                                : result.status === 'error'
                                                  ? 'bg-m3-error-container text-m3-on-error-container'
                                                  : 'bg-m3-surface-container text-m3-on-surface-variant'}"
                                        >
                                            <div class="truncate font-medium">{result.url}</div>
                                            <div>{result.message}</div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </Card>

                    <div class="mb-4 flex flex-col gap-3 md:flex-row">
                        <TextField
                            label={themeStore.t("meals.recipes.search")}
                            bind:value={recipeSearch}
                            leadingIcon={Search}
                            oninput={() => loadRecipes()}
                        />
                    </div>

                    {#if recipes.length}
                        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {#each recipes as recipe (recipe.slug)}
                                <button
                                    class="text-left"
                                    onclick={() => selectRecipe(recipe)}
                                >
                                    <Card variant="outlined" class="h-full overflow-hidden transition-colors hover:bg-m3-surface-container-high">
                                        <div class="aspect-[16/9] bg-m3-surface-container-high">
                                            {#if recipeImageUrl(recipe)}
                                                <img
                                                    src={recipeImageUrl(recipe)}
                                                    alt={recipe.name ?? themeStore.t("meals.recipes.recipe")}
                                                    class="h-full w-full object-cover"
                                                    onerror={() => markRecipeImageBroken(recipe)}
                                                />
                                            {:else}
                                                <div class="flex h-full items-center justify-center">
                                                    <Restaurant class="size-12 text-m3-on-surface-variant" />
                                                </div>
                                            {/if}
                                        </div>
                                        <div class="flex flex-col gap-2 p-4">
                                            <h2 class="line-clamp-2 text-m3-title-medium text-m3-on-surface">
                                                {recipe.name ?? themeStore.t("meals.recipes.untitled")}
                                            </h2>
                                            {#if recipe.description}
                                                <p class="line-clamp-2 text-m3-body-medium text-m3-on-surface-variant">
                                                    {recipe.description}
                                                </p>
                                            {/if}
                                            {#if recipeMeta(recipe)}
                                                <div class="flex items-center gap-1 text-m3-label-medium text-m3-on-surface-variant">
                                                    <Timer class="size-4" />
                                                    {recipeMeta(recipe)}
                                                </div>
                                            {/if}
                                        </div>
                                    </Card>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <div class="flex h-64 items-center justify-center text-center text-m3-on-surface-variant">
                            {themeStore.t("meals.recipes.empty")}
                        </div>
                    {/if}

                    {#if selectedRecipe}
                        <div
                            class="fixed inset-0 z-[60] flex items-end p-0 md:items-center md:justify-center md:p-6"
                            role="dialog"
                            aria-modal="true"
                            aria-label={selectedRecipe.name ?? themeStore.t("meals.recipes.recipe")}
                        >
                            <button
                                type="button"
                                class="absolute inset-0 bg-black/40"
                                aria-label={themeStore.t("common.close")}
                                onclick={() => (selectedRecipe = null)}
                            ></button>
                            <div class="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-t-3xl bg-m3-surface p-0 shadow-2xl md:rounded-3xl">
                                {#if recipeImageUrl(selectedRecipe)}
                                    <img
                                        src={recipeImageUrl(selectedRecipe)}
                                        alt={selectedRecipe.name ?? themeStore.t("meals.recipes.recipe")}
                                        class="h-64 w-full object-cover"
                                        onerror={() => markRecipeImageBroken(selectedRecipe)}
                                    />
                                {/if}
                                <div class="flex flex-col gap-5 p-6">
                                    <div>
                                        <h2 class="text-m3-headline-small text-m3-on-surface">
                                            {selectedRecipe.name}
                                        </h2>
                                        {#if selectedRecipe.description}
                                            <p class="mt-2 text-m3-body-medium text-m3-on-surface-variant">
                                                {selectedRecipe.description}
                                            </p>
                                        {/if}
                                    </div>

                                    <div class="grid gap-3 rounded-xl bg-m3-surface-container p-4 md:grid-cols-[1fr_140px]">
                                        <div class="flex flex-col justify-center gap-1">
                                            <div class="text-m3-title-small text-m3-on-surface">
                                                {themeStore.t("meals.recipes.baseServings", {
                                                    count: normalizeServings(selectedRecipe.recipeServings),
                                                })}
                                            </div>
                                            <div class="text-m3-body-small text-m3-on-surface-variant">
                                                {themeStore.t("meals.recipes.scalingHelp")}
                                            </div>
                                        </div>
                                        <label class="flex flex-col gap-1">
                                            <span class="text-m3-label-large text-m3-on-surface-variant">
                                                {themeStore.t("meals.recipes.people")}
                                            </span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                bind:value={recipePeople}
                                                class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                            />
                                        </label>
                                    </div>

                                    {#if selectedRecipe.recipeIngredient?.length}
                                        <section>
                                            <h3 class="mb-2 text-m3-title-medium text-m3-on-surface">
                                                {themeStore.t("meals.recipes.ingredientsFor", { count: recipePeople })}
                                            </h3>
                                            <div class="grid gap-2">
                                                {#each selectedRecipe.recipeIngredient as ingredient}
                                                    <div class="rounded-lg bg-m3-surface-container p-3 text-m3-body-medium text-m3-on-surface">
                                                        {scaledIngredientDisplay(ingredient)}
                                                    </div>
                                                {/each}
                                            </div>
                                        </section>
                                    {/if}

                                    {#if selectedRecipe.recipeIngredient?.length && shoppingLists.length}
                                        <section class="grid gap-3 rounded-xl border border-m3-outline-variant p-4 md:grid-cols-[1fr_auto] md:items-end">
                                            <label class="flex flex-col gap-1">
                                                <span class="text-m3-label-large text-m3-on-surface-variant">
                                                    {themeStore.t("meals.recipes.shoppingList")}
                                                </span>
                                                <select
                                                    bind:value={recipeShoppingListId}
                                                    class="min-h-14 rounded-md border border-m3-outline bg-m3-surface px-4 text-m3-body-large text-m3-on-surface"
                                                >
                                                    {#each shoppingLists as list (list.id)}
                                                        <option value={list.id}>
                                                            {list.name || themeStore.t("meals.shopping.list")}
                                                        </option>
                                                    {/each}
                                                </select>
                                            </label>
                                            <Button
                                                variant="filled"
                                                onclick={addSelectedRecipeToShoppingList}
                                                disabled={addingRecipeToShopping}
                                                icon={ShoppingCart}
                                            >
                                                {addingRecipeToShopping
                                                    ? themeStore.t("common.saving")
                                                    : themeStore.t("meals.recipes.addToShopping")}
                                            </Button>
                                        </section>
                                    {/if}

                                    {#if recipeDetailMessage}
                                        <p class="text-m3-body-small text-m3-on-surface-variant">
                                            {recipeDetailMessage}
                                        </p>
                                    {/if}

                                    {#if selectedRecipe.recipeInstructions?.length}
                                        <section>
                                            <h3 class="mb-2 text-m3-title-medium text-m3-on-surface">
                                                {themeStore.t("meals.recipes.instructions")}
                                            </h3>
                                            <ol class="flex flex-col gap-3">
                                                {#each selectedRecipe.recipeInstructions as instruction, index}
                                                    <li class="flex gap-3 rounded-lg bg-m3-surface-container p-3">
                                                        <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-m3-primary text-m3-label-medium text-m3-on-primary">
                                                            {index + 1}
                                                        </span>
                                                        <div class="text-m3-body-medium text-m3-on-surface">
                                                            {instruction.text || instruction.summary || instruction.title}
                                                        </div>
                                                    </li>
                                                {/each}
                                            </ol>
                                        </section>
                                    {/if}

                                    <div class="flex justify-end">
                                        <Button variant="outlined" onclick={() => (selectedRecipe = null)}>
                                            {themeStore.t("common.close")}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                {:else if activeTab === "shopping"}
                    {#if shoppingLists.length}
                        <div class="mb-4 flex gap-2 overflow-x-auto">
                            {#each shoppingLists as list (list.id)}
                                <button
                                    class="touch-target rounded-full px-4 text-m3-label-large font-medium whitespace-nowrap transition-colors
                                        {activeShoppingListId === list.id
                                        ? 'bg-m3-secondary-container text-m3-on-secondary-container'
                                        : 'bg-m3-surface-container text-m3-on-surface-variant hover:bg-m3-surface-container-highest'}"
                                    onclick={() => loadShoppingList(list.id)}
                                >
                                    {list.name || themeStore.t("meals.shopping.list")}
                                </button>
                            {/each}
                        </div>

                        <div class="grid gap-3">
                            {#each openShoppingItems as item (item.id)}
                                <div class="flex min-h-16 items-center gap-3 rounded-lg bg-m3-surface-container p-3">
                                    <Checkbox
                                        checked={item.checked}
                                        disabled={shoppingBusyItemId === item.id}
                                        onchange={(checked) => setShoppingItemChecked(item, checked)}
                                    />
                                    <div class="min-w-0 flex-1">
                                        <div class="truncate text-m3-body-large text-m3-on-surface">
                                            {itemLabel(item)}
                                        </div>
                                        {#if item.label?.name}
                                            <div class="text-m3-label-medium text-m3-on-surface-variant">
                                                {item.label.name}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}

                            {#if checkedShoppingItems.length}
                                <h2 class="mt-4 text-m3-title-small text-m3-on-surface-variant">
                                    {themeStore.t("meals.shopping.checked")}
                                </h2>
                                {#each checkedShoppingItems as item (item.id)}
                                    <div class="flex min-h-16 items-center gap-3 rounded-lg bg-m3-surface-container-low p-3 opacity-75">
                                        <Checkbox
                                            checked={item.checked}
                                            disabled={shoppingBusyItemId === item.id}
                                            onchange={(checked) => setShoppingItemChecked(item, checked)}
                                        />
                                        <div class="min-w-0 flex-1 truncate text-m3-body-large text-m3-on-surface-variant line-through">
                                            {itemLabel(item)}
                                        </div>
                                    </div>
                                {/each}
                            {/if}

                            {#if !activeShoppingItems.length}
                                <div class="flex h-64 items-center justify-center text-center text-m3-on-surface-variant">
                                    {themeStore.t("meals.shopping.empty")}
                                </div>
                            {/if}
                        </div>
                    {:else}
                        <div class="flex h-full items-center justify-center p-8 text-center text-m3-on-surface-variant">
                            {themeStore.t("meals.shopping.noLists")}
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    {/if}
</PageShell>
