# NGIG workspace

The home for all NextGen Industry Group apps and sites. It's a pnpm workspace:

- `apps/<name>`: one folder per app or site (e.g. `apps/industrialization-monitor`, the Startup Industrialization Monitor)
- `packages/brand` (`@ngig/brand`): shared design tokens, logos and brand rules
- `Branding Assets/`: original logo source files from the designer (AI/EPS/PDF/PNG). Don't edit these.

## Branding is mandatory
Every NGIG UI must follow `packages/brand/BRAND.md`:
- Import `@ngig/brand/tokens.css` and use the semantic tokens, not hex values.
- Fonts: Funnel Display (headings), Roboto Flex (body/UI).
- Plum `#6D2149` is the primary color. Copper `#C86438` is a sparing accent and is never used for small text.
- Logos come from `packages/brand/logos/`. Render them via `<img>`/`next/image`, not inlined, except the `-mono` files.
