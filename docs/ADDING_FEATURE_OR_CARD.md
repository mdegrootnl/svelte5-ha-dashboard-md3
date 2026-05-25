# Adding A Feature Or Card

This is the release gate for new dashboard functionality. The goal is to keep the app's edge:
backend-backed household state, touch-first quality, Dutch-first workflows, and visible design
discipline.

## Feature Gate

Before a feature is considered done:

- route UI lives in the feature route/component and uses `PageShell`
- root layout changes are limited to global shell behavior
- shared household preferences are stored through backend config or server-side runtime files
- browser storage is used only for startup cache, migration, auth/session compatibility, or explicitly local per-device behavior
- all supported languages are updated: Dutch, English, German, French, and Spanish
- risky flows have focused unit/component tests
- visual or layout-sensitive flows have Playwright coverage or a documented manual acceptance note
- README, `ARCHITECTURE.md`, and `BACKLOG.md` are updated when user-facing behavior, ownership, or status changes

## Card Gate

Before a card family is considered done:

- dashboard type/schema support exists
- renderer support exists
- editor/config sheet support exists
- card-library picker entry exists
- `/library` includes realistic examples
- generator placement exists when the card can be usefully generated
- service calls and derived state have focused tests
- long labels, empty/unavailable/error states, touch targets, and edit controls are checked

Required `/library` examples for new or heavily changed cards:

- default
- max capability
- compact/touch
- long text
- unavailable or empty
- edit-mode/action-row sensitive state when relevant

## Readability Gate

Image-backed and custom-background surfaces must preserve visual richness without flattening the
whole card.

- use adaptive foreground color when the background color is known
- put image-backed roots in `.readable-image-surface`
- use `.readable-on-image`, edge gradients, label stacks, or readable chips when the background is an image
- avoid full-card overlays unless the card explicitly needs one
- add or extend Playwright coverage when text sits on rendered image pixels

## Backend-State Gate

New shared preferences default to backend storage. Per-device tablet behavior remains local.

Allowed browser storage categories:

- fast startup or optimistic cache for backend-backed state
- one-time migration source for older local data
- standalone Home Assistant auth/session compatibility
- weekly disposable radio/search cache
- explicitly local kiosk/tablet device profile

Anything else needs an architecture note and a focused test.
