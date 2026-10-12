# NextGen Industry Group — Brand

Every NGIG app and site uses this package. Import `tokens.css` and use the **semantic** tokens (`--color-primary`, `--color-text`…), not raw hex values.

## Color

| Role | Name | Hex | Notes |
|---|---|---|---|
| Primary | Plum | `#6D2149` | Brand color: headers, primary buttons, links, logo. White text on plum is 10.7:1 |
| Primary | Linen | `#EEE9E2` | Warm surface for panels, cards and section bands |
| Primary | Mist | `#F6F6F6` | Subtle page background |
| Secondary | Copper | `#C86438` | Accent (the corner of the "G"). **3.9:1 on white: use it for graphics, icons, rules and large text (≥24px) only** |
| Secondary | Sage | `#9AA79C` | Supporting graphics and tags. Not for text |
| Secondary | Sage Light | `#D6E2D8` | Subtle success/info backgrounds |
| Neutral | Charcoal | `#343434` | Body text (12.5:1 on white) |
| Neutral | Gray 500 | `#A0A3A7` | Disabled states and dividers. **Not for text on white** (2.5:1) |
| Neutral | Gray 300 | `#C8CCD2` | Strong borders |
| Neutral | Gray 100 | `#E7EAEE` | Hairline borders |
| Neutral | White | `#FFFFFF` | Default background |

Derived values (not in the guide, added for accessibility and dark mode):
- Copper Dark `#A9522C`: white text on copper fills (5.3:1).
- Gray 700 `#6B6E73`: muted body text.
- For dark mode: Plum Light `#B9789A`, Copper Light `#DA8559`, Ink `#1E1A1C`.

**Proportions.** Plum and Linen carry the brand. Copper is a spark, used sparingly as in the logo. Sage and the neutrals support.

**Data visualization.** Use the validated categorical slots `--viz-cat-1…4` (light / dark):

| Slot | Light | Dark | Hue |
|---|---|---|---|
| 1 | `#8A2F5F` | `#C96AA6` | plum (brand-led) |
| 2 | `#D06B3A` | `#C8622F` | copper (brand-led) |
| 3 | `#2A78D6` | `#3987E5` | blue |
| 4 | `#1BAF7A` | `#199E70` | aqua, also used as the "Other" fold |

- These pass the dataviz validator on all pairs, on both the light (`#F2F3F0`) and dark (`#0C0C0C`) map backgrounds. The closest pair sits in the colorblind floor band, so always pair color with labels, a legend and tooltips.
- **Bubble maps, scatter plots and other all-pairs forms take at most 4 categories.** Fold the rest into slot 4, or let people isolate categories through filters. No set of 8 hues passes on those forms.
- Bar and line charts compare only adjacent series, so they can go further. Run `validate_palette.js` (dataviz skill) before adding a slot.
- Text, values and labels use text tokens, never a series color.

## Typography

| Role | Family | Weights | Use |
|---|---|---|---|
| Primary / display | **Funnel Display** (Google Fonts) | Light 300, Regular 400, Medium 500, Bold 700, Extrabold 800 | Headlines, big numbers, nav and the brand voice. Medium is the default for headings |
| Secondary / body | **Roboto Flex** (Google Fonts) | Light 300 to Extrabold 800 (variable) | Body copy, UI, tables, forms, labels. Regular 400 for body, Semibold 600 for labels |

In Next.js:
```ts
import { Funnel_Display, Roboto_Flex } from "next/font/google";
const display = Funnel_Display({ subsets: ["latin"], variable: "--font-funnel-display" });
const body = Roboto_Flex({ subsets: ["latin"], variable: "--font-roboto-flex" });
// <html className={`${display.variable} ${body.variable}`}>
```

## Logos (`logos/`)

| File | Use |
|---|---|
| `horizontal-small-{color,white,black}.svg` | Default for app headers and nav |
| `horizontal-large-{color,white,black}.svg` | Hero areas and large placements |
| `vertical-{color,white,black}.svg` | Square-ish placements, footers, social |
| `lettermark-{color,white,black}.svg` | Favicon, app icon, tight spaces |
| `*-mono.svg` | Single color via `currentColor`, for theme-aware inline use |

Rules:
- The color logo's "NextGen Industry" wordmark is **black**, so on Plum or any dark background use the `-white` version.
- The Illustrator SVGs all reuse `id="Layer_1"` and `.st0`/`.st1` classes. **Render them with `<img>` / `next/image`, not inlined**, or their styles collide. Inline only the `-mono` files.
- Don't recolor, stretch, outline or add effects. Keep clear space of at least the height of the copper triangle around the mark.
- Originals (AI/EPS/PDF/PNG/JPG) are in `../../Branding Assets/`. Some filenames there are mislabeled; the folder names are correct. The cleanly named copies here are the ones apps should use.

## UI defaults
- Radii are small (2–8px), matching the logo's hard geometric edges. Avoid pill shapes except for tags.
- Primary button: Plum fill, white text. Secondary button: Plum outline. Accent button (rare): Copper Dark fill.
- Focus ring: 2px Copper.
- Embeds (e.g. maps in iframes) use a transparent or white background so they sit cleanly on nextgenindustry.com.
