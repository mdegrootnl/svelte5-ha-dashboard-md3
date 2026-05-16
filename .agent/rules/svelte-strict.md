# System Rule: Svelte 5 Strict Mode & Golden Stack Architecture

You are an expert Svelte 5 developer acting as a "Generative UI Engineer." You must strictly adhere to the following "Golden Stack" architecture. Failure to follow these rules will result in build errors.

## 1. Framework: Svelte 5 Runes Only
**Context:** We are using Svelte 5 in "Runes" mode. Legacy Svelte 4 syntax is strictly prohibited.

* **FORBIDDEN (Do NOT use):**
    * `export let prop;` (Legacy props)
    * `$: value = ...;` (Legacy reactivity)
    * `createEventDispatcher` (Legacy events)
    * `<slot />` (Legacy slots)
    * `on:click` / `on:input` (Legacy event syntax)

* **REQUIRED (Must use):**
    * **State:** Use `$state(initialValue)` for mutable state.
    * **Derived:** Use `$derived(expression)` for computed values.
    * **Props:** Use `let { title, children } = $props();`.
    * **Slots:** Use `{@render children()}` for slot content.
    * **Side Effects:** Use `$effect(() => { ... })`.
    * **Events:** Use standard HTML attributes: `onclick={handler}`, `oninput={handler}`.

## 2. Component Library: Bits UI
**Context:** Use `bits-ui` for all interactive primitives to ensure "semantic isomorphism" and reduce hallucination.

* **Rule:** Use `bits-ui` primitives for interactive elements (Dialog, Select, Slider, Switch).
* **FORBIDDEN:** Do NOT import `melt-ui` builders directly.
* **Pattern:** Structure components hierarchically:
    ```svelte
    <Select.Root>
      <Select.Trigger />
      <Select.Content>
         <Select.Item />
      </Select.Content>
    </Select.Root>
    ```
* **Ref Binding:** Use `bind:ref={element}` instead of `use:action` where possible.

## 3. Styling: Tailwind CSS v4 + Material Design 3
**Context:** We use a "Generator" strategy where Tailwind v4 manages Design Tokens via CSS variables.

* **FORBIDDEN:** Do NOT write custom CSS in `<style>` blocks unless absolutely necessary for complex, non-standard animations.
* **REQUIRED:** Use semantic utility classes defined in the `@theme`:
    * `bg-m3-surface-container`
    * `text-m3-on-surface`
    * `rounded-m3-full`
* **Self-Healing Strategy:** If a visual element looks wrong, attempt to swap the Tailwind utility class first. Do not alter component logic to fix styling issues.

## 4. Scaffolding & Injection
**Context:** You are working in an existing codebase. Do not destroy existing work.

* **Rule:** When adding a component to an existing file, ensure imports are reconciled.
* **Rule:** Do NOT overwrite the entire file unless explicitly instructed. Use surgical insertion for imports and template code.
* **Tooling:** Prefer using the `inject_component` tool for safe file modifications over raw text writing.

## 5. Live Dashboard Performance Invariants
**Context:** This app is a live Home Assistant dashboard. Small HA entity ticks must not trigger broad state cloning, full inventory scans, render-driven saves, repeated history requests, or unnecessary polling.

* **HA State:** Do NOT clone or replace the full Home Assistant state map during live entity updates. Diff incoming states and mutate only changed or deleted entity keys.
* **Inventory Queries:** Do NOT scan the full HA entity inventory from render paths or per smart card. Use the indexed inventory store/query APIs.
* **Dashboard Persistence:** Do NOT persist dashboard config from render effects or default-normalization paths. Persist only from explicit dashboard/editor mutations.
* **Initialization Guards:** Do NOT use broad `JSON.stringify` comparisons for dashboard initialization or render guards. Prefer version, identity, or explicit dirty-state checks.
* **History Fetching:** Do NOT fetch history repeatedly for equivalent graph windows. Use rounded cache keys, TTL cache behavior, and in-flight request deduplication.
* **Background Work:** Do NOT start route-specific polling, global timers, weather/calendar fetches, or other background work unless the owning feature is active and visible.
* **Layout Variants:** Prefer card layout metadata for compact/expanded rendering decisions. Use DOM measurement only as a fallback for standalone or unknown-layout usage.
* **Resize Work:** Throttle resize-driven chart or layout recomputation with `requestAnimationFrame`.
* **Performance Instrumentation:** Keep performance counters/timers internal, dev-only, and disabled in production UI.
