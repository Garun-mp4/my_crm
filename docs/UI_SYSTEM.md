# my_crm UI system

## Intent

The interface is an internal lead-research desk. It should help a person scan, verify, and decide without feeling like an oversized spreadsheet or a generic analytics dashboard.

## Visual tokens

- Canvas: `#f5f5f5`.
- Ink: `#0c0a09`; body text: `#4e4e4e`; muted text: `#777169`.
- Hairlines: `#e7e5e4`, `#f0efed`, `#d6d3d1`.
- Surfaces: `#ffffff` for cards and lists, `#292524` for intentional dark utility surfaces.
- Context accents: mint `#a7e5d3`, peach `#f4c5a8`, lavender `#c8b8e0`, sky `#a8c8e8`, rose `#e8b8c4`.
- Semantic colors: success `#16a34a`, error `#dc2626`; never use accent colors as decoration when they carry state.

## Layout and behavior

- Inter is the UI font. The display serif is reserved for page-level headings.
- Use a 4px spacing base with 8/12/16/24/32/48/96px steps.
- Use one scroll container for a lead list, sticky column headers, preserved query/sort/filter state, and no nested wheel traps.
- Dense lists use server-side pagination and a bounded row window; virtualization is an optimization, not a substitute for predictable interaction.
- Responsive breakpoints: mobile below 640px, tablet 640–1024px, desktop 1024–1280px, wide above 1280px. On small screens, lead detail becomes a stacked flow and table columns collapse into a readable summary.
- Minimum interactive target: 48px. Every action has hover, focus-visible, selected, disabled, loading, empty, error, and permission-denied states.
- Depth is limited to hairlines plus one subtle shadow: `0 4px 16px rgba(0, 0, 0, 0.04)`.

## Signature interaction

The lead list keeps a quiet left status rail and a compact evidence freshness indicator. Selecting a row opens a detail surface without losing the list position. A research item can be expanded to show source, timestamp, confidence, and whether the value is observed or generated. Outreach drafts are visually separated from facts and always show their approval state.
