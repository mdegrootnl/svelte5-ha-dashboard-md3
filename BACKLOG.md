# Backlog

This backlog tracks near-term product and engineering work. Temporary implementation notes can live in `planning/` and should be promoted or removed once the work is complete.

## Current Focus

### Generator Room Dashboard Polish

Source plan: [planning/temp-kitchen-generator-feedback-plan.md](planning/temp-kitchen-generator-feedback-plan.md)

Status: implementation complete; awaiting live visual acceptance on a freshly regenerated kitchen dashboard.

Improve generated room dashboards so they are less repetitive, less bulky, and less duplicate-prone.

Completed:

- Added generator entity ownership and deduplication before cards are created.
- Uses Home Assistant light groups instead of individual member lights when a real group exists.
- Keeps nested Home Assistant light groups visible; suppresses only individual member lights.
- Does not infer light groups from similar names; grouping belongs in Home Assistant.
- Suppresses duplicate remotes when the media card already controls the same media player.
- Keeps remotes only when they control a distinct, visible target.
- Keeps entity names as Home Assistant provides them; quality hints cover repetitive names.
- Hides unknown/unavailable sensors from normal primary/status/history sections.
- Skips unknown/unavailable entities from normal generated cards.
- Generates compact controls for secondary lights and switches.
- Preserves one large card for the primary room control only.
- Adds clean/regenerate buttons for the whole generated home set and the current room/page.
- Keeps clean/regenerate preview-first and explicit before applying, with a second confirmation for clean apply.
- Adds preview quality hints for grouped, skipped, name-review, and deduplicated entities.
- Adds generator tests for light groups, media/remote deduplication, name cleanup, sensor filtering, and compact room output.
- Uses Home Assistant area pictures as optional room-card preview images on generated house/floor room navigation cards.
- Loads room-card preview images through the authenticated HA image helper so browser-visible URLs do not expose tokens.
- Adds non-blocking generation quality hints for populated rooms that do not yet have a Home Assistant area picture.
- Adds a deterministic room visual profile helper for room-kind icons and future image prompt seeds.
- Persists room visual profile metadata on generated navigation cards so future preview image generation can be audited and cached.
- Makes generated room navigation cards tile-shaped before adding image assets, reducing clipping and the stretched-row look.
- Caps dynamic icon glyph sizing inside scalable icon containers so room-card icons cannot overflow their circular affordances.
- Uses the taller square room-card ratio only when a generated navigation card has an actual image; icon-only fallback cards stay more compact.
- Adds deterministic local generated room preview images for room navigation cards when Home Assistant does not provide an area picture.
- Keeps Home Assistant area pictures as the preferred image source; generated previews are only a fallback.

Remaining acceptance:

- Regenerate the kitchen dashboard with Clean Generated.
- Review the actual page visually on desktop and mobile.
- Add or confirm Home Assistant area pictures for rooms where a real room photo should replace the generated preview.
- Add an optional stock-photo provider flow for high-quality room preview images when Home Assistant has no area picture.
- Promote any final visual tweaks into tests, then archive or remove the temporary planning note.

Accepted decisions:

- Light groups come from Home Assistant only.
- Unknown/unavailable cards are hidden from normal generated dashboards.
- Remotes are skipped when they control the same media player already represented by a media card.
- Names stay as configured in Home Assistant.
- Quality hints are enough for suppressed entities; users can add entities back with normal editing tools.

Resolved design decisions:

- Secondary controls use compact button cards.
- Default large-card budget is one primary control per room.
- Temperature, humidity, CO2, illuminance, and similar comfort readings use readable compact state cards; additional sensors use summaries or graphs where useful.
- Clean/regenerate replaces generated cards only, preserving manual and pinned content.
- Room navigation cards use a compact tile ratio on generated home/floor dashboards.
- Generated room previews are local deterministic SVG image assets served by the app; HA area pictures still override them, and AI-generated bitmap assets remain optional later polish.
- Real stock photos should be chosen through a controlled provider flow, stored with attribution/source metadata, and cached or persisted so dashboards do not depend on live third-party lookups during render.

## Later

- Promote stable generator rules into `architecture.md`.
- Add label/entity quality tooling once the generator behavior is stable.
- Revisit runtime conditional visibility after generation-time attention cards settle.
- Evaluate stock-photo providers such as Pexels, Unsplash, Pixabay, and curated/self-hosted packs for room preview images.
- Add optional stock photo search/selection for room preview images, with server-side API keys where needed, attribution/source metadata, and deterministic cached selections.
- Add optional AI-generated bitmap room preview assets only if stock photos and local SVG previews are not rich enough.
