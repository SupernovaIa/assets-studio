# Plan — component-library architecture for slides

Pivot from "LLM invents CSS per slide" to "LLM composes pre-styled components". The reference targets are `~/Downloads/slides.html` and `~/Downloads/slides_pmf.html` — both share the same architecture and that's what we want to reach.

**Branch**: `feat/component-library` (off `main`).

---

## Why

Today: each content slide is a fresh CSS scope (`#sN .my-class { ... }`). Even with consistency rules and few-shot examples, the LLM reinvents `.label`, `.bullets`, `.callout` per slide with subtle drift. It never produces compound components like a callout with circular icon, a flow diagram with arrows, or a yes/no comparison with green/red headers — those need coreography the model doesn't synthesise from prose rules.

Reference decks reach that quality because **they have a component library defined once at the top of the file**. Each slide invokes `<div class="callout note">…</div>` — it doesn't invent the callout. We need the same.

---

## Reference decks — what they have

Both reference decks share the same library (~150 lines of CSS at the top). Catalogue extracted from `slides.html` + `slides_pmf.html`:

### Typography primitives
- `.label` — eyebrow (10px / 700 / 0.18em / mint)
- `.body` — paragraph (14px / 1.75)
- `.sub` — subtitle (14px / 300 / dimmed)
- `.accent-line` — small underline divider (40-48px × 3px mint)
- `.dim` — muted text variant

### Components
- `.bullets` — list with mint dot prefix
- Inline `<code>` — mint-tinted background pill
- `.code-block` (`<pre>`) — dark navy bg, syntax-highlighted spans (`.kw`, `.str`, `.cm`, `.fg`), top mint border, optional `.lang-badge` top-right
- `.callout.note` / `.callout.warn` / `.callout.success` — coloured top border, soft bg, circular icon, title + body
- `.cards` (3-col grid) + `.card` with `.card-icon` / `.card-title` / `.card-body`
- `.col-card.green` / `.col-card.red` — paired do/don't cards with semantic top border
- `.comp-grid` — yes/no table with green/red header rows
- `.steps` + `.step-num` (mint circle) + `.step-text` — numbered process
- `.flow` + `.flow-node` + `.flow-arrow` — horizontal process diagram
- `.checklist` + `.check-item` + `.check-box` — interactive-looking list
- `.tag` / `.chip` — rounded pill label
- `.kpi` (implicit in slides_pmf) — big number + label
- `.slide-footer` — brand + page number

### Theme variants (per slide)
- `.dark` / `.dark2` / `.dark3` (teal shades)
- `.light` (cream bg)
- `.white` (pure white)
- `.ink-theme` (dark slate)
- Text colours adapt automatically: `.light .body { color: var(--gray); }` etc.

### Semantic palette beyond accent
- `--green` (success/do)
- `--red` (danger/don't)
- `--warn` (warning callout)
- `--accent-pale` (soft tinted bg)
- `--code-bg` / `--code-fg` / `--code-cm` / `--code-str` (code highlight)

---

## Implementation phases

### Phase 1 — design the component vocabulary (no code)

Decide *which* components to ship in v1. Don't try to port everything — pick the high-leverage ones.

**Must include (v1)**:
- `.label`, `.body`, `.sub`, `.accent-line`
- `.bullets`
- `<code>` inline + `.code-block` with `.kw` / `.str` / `.cm`
- `.callout.note` / `.callout.warn`
- `.cards` + `.card`
- `.steps` + `.step-num`
- `.comp-grid` (yes/no with green/red headers)
- `.tag`
- Themes: `.theme-dark`, `.theme-light`, `.theme-accent`

**Defer to v2**:
- `.flow` (process diagram with arrows)
- `.checklist` (interactive-looking)
- `.kpi` blocks
- `.col-card.green` / `.red` (overlaps with `.comp-grid`)
- More theme variants

Goal: ~10 components, ~150-200 lines of CSS. Enough surface for the LLM to compose interesting slides without bloat.

### Phase 2 — extend the brand contract

Add a `semanticPalette` block to `brand.json` and `Brand` type:

```json
"semanticPalette": {
  "success": "#2E7D5A",
  "warning": "#D4930A",
  "danger":  "#B03030",
  "accentPale": "#EDF7F6",
  "code": {
    "background": "#0F1E28",
    "foreground": "#A8D5CF",
    "comment":    "#4E7A8C",
    "string":     "#F5C97A",
    "keyword":    "#7EB8F5"
  }
}
```

All optional — when missing, derive sensible defaults from the existing palette via `color-mix` (e.g. `--accent-pale = color-mix(in srgb, var(--accent) 12%, var(--surface))`).

### Phase 3 — rebuild `render.ts`

- Inject the component library CSS into `BASE_CSS`, themed via brand variables.
- Keep `.slide-root` as the per-slide container but drop `justify-content: center` default — leave it to themes/composition.
- Add theme support: `.slide-root.theme-dark`, `.theme-light`, `.theme-accent` swap surface/text colours.
- Tag balancer (`balanceTags()`) stays. The slide-root id collision fix stays.

### Phase 4 — extend the schema

Add to `ContentSlide` (and zod schema in routes):

```ts
theme?: 'dark' | 'light' | 'accent';   // default 'light'
```

The renderer applies the class to `.slide-root`.

### Phase 5 — rewrite the prompt

The new prompt is even shorter than today. Core message: **"compose, don't invent"**.

Sections:
1. Output schema (unchanged structure, plus `theme` field).
2. Brand variables (now including semantic ones).
3. **Component catalogue** — one-line description per component, what classes to use:
   ```
   .label              eyebrow text — short, uppercase
   .body               paragraph text
   .accent-line        small horizontal divider
   .bullets > li       list with dot
   <code>              inline code
   .code-block         multi-line code (use .kw .str .cm spans for highlight)
   .callout.note       info box (mint top border)
   .callout.warn       warning box (amber top border)
   .cards > .card      3-column card grid
   .steps > .step      numbered process steps
   .comp-grid          yes/no comparison
   .tag                small pill label
   ```
4. **Theme picker** — per-slide `theme: 'dark' | 'light' | 'accent'` for visual variety.
5. **Per-slide CSS rules**: only for layout positioning (gaps, custom grids). NEVER redefine component typography or colours.
6. Two few-shot examples that USE the components (not invent CSS).
7. Density rules ("sparse slide test") survive — that worked.

Drop entirely:
- The "non-negotiables" about reusing `.label` / `.body` sizes — handled by the library now.
- Most CSS syntax instructions — LLM produces less CSS, less room to err.

### Phase 6 — verify

- Generate a deck from the same markdown we used today and compare side-by-side with `slides.html` / `slides_pmf.html`.
- Test: callout, code-block, cards, steps, comp-grid each appear at least once across an 8-slide deck.
- Test: theme variation between slides (not all dark, not all light).
- Test: edit endpoint still works — it should be safer because LLM can't accidentally restyle a component.

---

## Open questions for next session

1. **Should themes be per-slide or per-section?** Per-slide gives variety but risks visual chaos. Per-section (cover dark, content light, summary accent) might be cleaner. Lean: per-slide, LLM decides.
2. **How do we handle infographic styling?** Component library is for slides only. Infographic stays as-is (single LLM-generated PNG).
3. **Should `.slide-footer` be auto-injected by renderer (like `.top-bar`)?** Probably yes — brand + page num is chrome, not content. Saves the LLM from emitting it.
4. **Do we let the LLM add custom classes for slides that genuinely need uniqueness?** Yes, scoped to `#sN`, but ONLY for layout (positions, gaps). Hard rule.
5. **Edit endpoint changes?** Same prompt structure but the LLM should be told "the deck uses the standard component library — prefer changing data over styles".

---

## Out of scope

- More than two themes (light + dark). Add `accent` only if first cut feels flat.
- Custom illustrations / abstract shapes per the `frontend-slides` skill — adds JS / SVG complexity.
- Animations beyond the existing slide transitions.
- Configurable component library (per-brand component overrides). v1 is one library, themed via vars.

---

## Reference files

- `~/Downloads/slides.html` (lines 1-637 are the component library + `:root`; slides start at 644)
- `~/Downloads/slides_pmf.html` (same structure, slightly different vocabulary)

Both use Poppins + JetBrains Mono. Mint accent (#6BBFB5) on teal (#1B3D4F) — thePower brand-aligned.

---

## Estimated effort

- Phase 1: 30 min (whiteboard the catalogue)
- Phase 2-3: 90 min (CSS + brand schema)
- Phase 4-5: 60 min (types, schema, prompt rewrite)
- Phase 6: 30 min (test + tweak)

Total: ~3.5 hours focused. Doable in one session.
