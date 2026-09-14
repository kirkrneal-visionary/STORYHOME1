# Story Home typography and spacing

Ordinary website and application text uses the platform interface stack:

`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

This is our chosen standard. It is not a claim about any third-party product’s exact fonts.

Tokens live in `src/app/globals.css` and `src/lib/typography.ts`. Keep them in sync.

## Type roles

| Role | Size / line | Weight | Class |
| --- | --- | --- | --- |
| Marketing hero | 32/38 mobile, 40/46 desktop | 600 | `.type-hero` |
| Application page title | 22/28 mobile, 24/30 desktop | 600 | `.type-page-title` |
| Section heading | 18/24 | 600 | `.type-section` |
| Card or row title | 16/22 | 600 | `.type-card-title` |
| Standard UI | 15/22 | 400 | `.type-ui` (body default) |
| Longer reading | 16/24 | 400 | `.type-prose` |
| Metadata | 13/18 | 400 | `.type-meta` |
| Labels, tabs, buttons | 14/20 | 500–600 | `.type-control` |
| Mobile inputs | 16/24 | 400 | `.field-input` |
| Caption / badge | 12/16 | 500 | `.type-caption` |

Heading elements (`h1`–`h3`) keep semantic rank. Visual size comes from the roles above.

Do not use 10–11px for primary information or actions. Do not shrink `html` font-size or apply global zoom to manufacture density.

## Spacing

4px increments. Defaults: 16px page gutters, 12–16px card padding, 8–12px related items, 16–24px sections, 44px minimum primary control height.

## Wordmark

`.story-wordmark` and `.story-wordmark-tagline` isolate STORYHOME lettering. They do not change surrounding UI text.

## Exceptions

| Surface | Font | Why |
| --- | --- | --- |
| Map place labels | Noto Sans Regular / Bold in the glyph atlas (`src/lib/map-style.ts`) | MapLibre/Mapbox cannot use CSS `system-ui`. Blind substitution blanks labels. |
| Map HTML popups and controls | `--font-ui` | CSS chrome, not glyphs. |
| `code`, `pre`, `.font-code` | `ui-monospace` | Actual code only. |
| Printed corridor/export HTML | Document-local stacks in those generators | Print handoff, not the live UI. |
| Evidence chips | Uppercase KNOWN, CALCULATED, ESTIMATED, OBSERVED, VERIFY, UNKNOWN via `.type-evidence` | Status meaning. |

`.font-serif` and `.font-mono` resolve to the UI stack so leftover class names do not reintroduce webfonts. Prefer the semantic `.type-*` classes in new work.

## Layout clearance

`--story-safe-top`, `--story-bottom-clearance`, and `--story-workspace-top` keep overlay header, Archie ribbon, and bottom dock from covering content. Preserve those when adding sticky chrome.
