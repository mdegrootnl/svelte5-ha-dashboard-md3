# Temporary Plan: Generator Room Dashboard Polish

Date: 2026-05-16

Status: implemented. Durable decisions were promoted to `architecture.md`; keep this note only until the regenerated kitchen dashboard has had a final visual acceptance pass.

## Context

The generated kitchen dashboard shows several generator weaknesses:

- Room names repeat inside room-local entity titles.
- Individual lights are generated even when a grouped control would be better.
- Unavailable or unknown sensors appear as normal dashboard data.
- Large control cards are used for low-importance individual entities.
- Media and remote cards can duplicate the same controlled device.
- Dense status data gets cramped while primary control cards leave too much empty space.

The next wave should make the generator behave more like a dashboard designer: choose the right representative controls, suppress duplicates, and make room pages readable at a glance.

## Goals

- Keep the home/root dashboard light and room-navigation focused.
- Make room dashboards calmer, denser where appropriate, and more readable.
- Prefer real Home Assistant grouping and relationships over name-only guesses.
- Keep generated cards editable after apply.
- Add an explicit clean/regenerate workflow for the whole generated home set and for an individual room/page.
- Preserve Svelte 5 strict rules, MD3 styling, and render-path performance constraints.

## Non-Goals

- Do not add another card family in this wave.
- Do not invent or persist fake Home Assistant groups.
- Do not execute Home Assistant service actions during generation.
- Do not create separate mobile/tablet/desktop generated dashboards.
- Do not copy HACS card code or YAML/template-heavy implementation patterns.
- Do not silently overwrite a dashboard without a preview and a clear confirmation.

## Work Plan

### 1. Entity Ownership And Deduplication

Add a generator ownership pass before card creation. The pass decides which entity owns a visible dashboard role.

Rules:

- If a light is part of a detected Home Assistant light group, generate the light group and suppress the member lights.
- Light groups must come from Home Assistant. Do not infer or create dashboard-only light groups from similar names.
- If no real Home Assistant light group exists, keep individual lights but prefer compact cards or rows.
- If a media player receives a media card, do not also generate a remote for the same controlled entity.
- Generate a remote only when it controls a distinct room-relevant target.
- Make remote target identity visible in the generated title, subtitle, or options.
- Avoid generating both a generic button and a specialist panel for the same entity unless they serve distinct purposes.

### 2. Entity Display Names

Keep generated card names aligned with Home Assistant names.

Rules:

- Do not strip room prefixes or rewrite names in the generator.
- Entity naming should be controlled in Home Assistant.
- Quality hints may point out repetitive names, but the generator should not rename them automatically.

### 3. Sensor Quality Filtering

Prevent dead data from appearing as primary dashboard content.

Rules:

- Hide `unknown`, `unavailable`, empty, non-numeric, or malformed sensor values from normal comfort/status/history sections.
- Do not generate normal cards for unknown or unavailable entities.
- Quality hints should report skipped unknown/unavailable entities where useful.
- Require currently valid numeric state for generated graph cards.
- Prefer readable state cards for temperature, humidity, CO2, illuminance, power, and battery when relevant.

### 4. Control Density And Proportions

Change room primary-control generation so visual weight matches importance.

Rules:

- Primary room light, climate, cover, media player, or active appliance can receive a larger card.
- Individual secondary lights and switches should use compact button cards.
- Related lights should become a compact grid unless a real HA group exists.
- Cap the number of large control cards per room.
- Dense status and sensor data should not be hidden in tiny attribute rows.

### 5. Room Section Layout

Keep room dashboards in this order:

1. Room title
2. Attention
3. Primary controls
4. Comfort and climate
5. Media
6. Openings, security, and status
7. Sensors and history
8. Actions
9. Maintenance

Guidance:

- The kitchen should show readable comfort/state cards for temperature and humidity.
- Technical or low-importance sensors should be omitted or moved to maintenance.
- Opening/security sensors should be grouped separately from environmental sensors.

### 6. Generator Quality Hints

Add preview hints explaining generator choices.

Examples:

- `Using light group "Keukenkast" instead of 4 member lights.`
- `Skipped 3 unavailable sensors from primary view.`
- `Skipped 8 repetitive names; update friendly names in Home Assistant for cleaner labels.`
- `Skipped remote because media player already has media controls.`
- `No HA light group found for similar cabinet lights; generated compact individual controls.`

### 7. Clean And Regenerate Workflow

Add a clear dashboard cleaning/regeneration path to the existing generator UI.

Rules:

- Add a clean/regenerate action for the whole generated home set.
- Add a clean/regenerate action for the current room/page.
- Cleaning must be explicit and confirmed before applying.
- Regeneration must still use the preview-first workflow.
- Whole-home regeneration should rebuild the home overview plus generated room dashboards.
- Current-page regeneration should rebuild only the active generated page/dashboard.
- Normal editing features remain the way to add suppressed entities back after apply.
- Quality hints are enough for suppressed entities; the preview does not need a dedicated restore control in this wave.
- Generated room navigation cards use Home Assistant area pictures when they exist; otherwise they use deterministic local generated preview images.
- Room preview images must load through the authenticated HA image helper and must not introduce token-bearing browser URLs.
- Generation quality hints should call out populated rooms using generated fallback previews because they have no Home Assistant area picture.
- Room visual classification should be deterministic and shared by icons now and generated image prompt seeds later.
- Generated navigation cards should carry typed visual profile metadata so future image generation is explainable and cacheable.
- Generated room navigation cards should be tile-shaped before image mode becomes common.

Open implementation detail:

- Decide whether cleaning removes only generated cards/dashboards or every card in the selected scope. Recommended default: remove generated cards by default and offer an explicit "clean all cards in scope" confirmation only later.
- Decide later whether richer AI-generated room preview images should be stored as curated static assets, ignored uploaded assets, or user-managed Home Assistant area pictures.

### 8. Tests

Add tests for:

- Light group suppresses member lights.
- Media card suppresses duplicate remote.
- Remote remains when it controls a distinct target.
- Unknown and unavailable sensors are excluded from primary/status/history sections.
- Repetitive names produce quality hints instead of generator-side renames.
- Kitchen-like fixture generates compact lights and readable comfort cards.
- Clean/regenerate whole-home flow produces a preview before applying.
- Clean/regenerate current-page flow affects only the selected page.
- Existing generator configs remain valid.
- Home Assistant area pictures become image-mode room navigation cards while rooms without pictures use local generated preview images.
- Missing Home Assistant area pictures produce suggestion-level quality hints.
- Room visual profiles classify common areas such as kitchen, bathroom, bedroom, kids room, office, hallway, garage, utility, laundry, garden, and generic room.
- Navigation card options persist `visualKind`, `visualAudience`, `visualPromptSeed`, and image source metadata.
- Generated room navigation cards use a more square tile ratio to avoid stretched rows and clipped content.

## Accepted Design Decisions

- **Light group source of truth:** Groups come from Home Assistant only. Do not infer or create light groups from similar names.
- **Unknown sensor handling:** Unknown and unavailable cards are hidden from normal generated dashboards.
- **Remote/media rule:** Remotes are skipped when they control the same media player already represented by a media card.
- **Name cleanup:** Keep names as Home Assistant provides them. Naming cleanup belongs in Home Assistant, not the generator.
- **User override model:** Quality hints are enough. Users can use normal editing features to add entities back.

## Design Decisions Resolved

- **Compact control style:** Secondary lights and switches render as compact button cards.
- **Large card budget:** One large primary room control is generated by default.
- **Sensor card choice:** Comfort readings use compact state cards; graph-worthy numeric sensors can receive graph cards; lower-priority sensors use summary collections.
- **Clean scope:** Clean regeneration replaces generated cards in scope and preserves manual and pinned content. Applying clean regeneration requires a second confirmation in the preview sheet.
- **Room preview image source:** Use Home Assistant area pictures first. Local generated preview images are the fallback. Richer AI-generated bitmap previews remain a later optional asset pipeline, not runtime generation inside dashboard rendering.
- **Missing preview image feedback:** Missing Home Assistant room pictures are suggestions only; the generated dashboard remains valid, visual, and editable because it has local fallback previews.
- **Gendered room profile inference:** Only explicit terms such as boy/girl/jongen/meisje should select gendered room profiles. Personal names stay neutral unless Home Assistant naming makes the intent explicit.
- **Visual metadata:** Visual profile metadata is configuration data only in this wave; render paths still use the existing navigation card fields.
- **Room tile proportion:** Generated home/floor room navigation uses compact tile sizing rather than wide list-row sizing.

## Implementation Order

1. Build entity ownership/dedup helpers in the generator domain layer.
2. Add light group/member suppression.
3. Add media/remote deduplication.
4. Add quality hints for repetitive Home Assistant names without renaming.
5. Tighten unknown/unavailable sensor filtering.
6. Adjust room generation layout and card sizing choices.
7. Add clean/regenerate actions for whole-home and current-page scopes.
8. Add preview quality hints.
9. Add Home Assistant area-picture support for generated room navigation cards.
10. Add deterministic room visual profiles for icons and future prompt seeds.
11. Run `npm run check`, `npm test -- --run`, and `npm run build`.
