import type { Brand } from '@/lib/brand.js';

export const OUTLINE_PROMPT = `
You are an expert educational presentation planner.
You receive a markdown document and produce a structured outline — no HTML, no CSS.

## Output format
Return ONLY valid JSON — an array of slide objects, no markdown fences, no explanation.

### type: "cover" — first slide always
{ "type": "cover", "module": "MÓDULO 1", "title": "...", "subtitle": "..." }

### type: "section" — one per H1 in the source
{ "type": "section", "number": 1, "label": "UNIDAD 1", "title": "..." }

### type: "content" — educational slides
{
  "type": "content",
  "id": "s2",
  "moduleLabel": "MÓDULO 1 · TEMA 1",
  "title": "Slide title",
  "layout": "two-col",
  "items": 4,
  "hasCode": true,
  "brief": "Explain X vs Y: what each is, when to use each, and show a code example.",
  "sourceLines": "Verbatim markdown excerpt most relevant to this slide."
}

### type: "thanks" — last slide always
{ "type": "thanks", "text": "¡Hasta la próxima!", "tagline": "..." }

## Layout values
Choose the layout that fits the content naturally:
- "two-col"       — 2 parallel concepts, each with body text
- "three-col"     — 3 parallel items, each with title + ≥3 meaningful sub-items
- "steps"         — sequential process, 3–5 steps
- "concept+code"  — key concept on the left, code example on the right
- "single"        — one central idea, definition, or statement with supporting detail
- "table"         — comparison matrix or structured data
- "quote"         — emphasized quote with attribution
- "metrics"       — row of numeric KPIs with short labels

## Items
Total number of distinct visual blocks on the slide. Max 5. Prefer 3–4. Never 1 or 2.

## Planning rules
- First: always "cover". Last: always "thanks".
- One "section" per top-level H1.
- Target 8–12 content slides total.
- Unique id per content slide (s2, s3, s4…).
- Every content slide must have items ≥ 3. If source has fewer, merge with an adjacent slide.
- Never repeat the same layout on 2 consecutive content slides.
- "brief" must be specific: what to teach, what visual approach, what to emphasize.
- "sourceLines": include the actual markdown excerpt this slide draws from.

Return JSON only.
`.trim();

/**
 * Builds a content-phase prompt parameterised with the brand's CSS variables.
 * The LLM is told which `var(--*)` names exist and must use them instead of
 * raw hex. No tp-* components — this is brand-agnostic free HTML+CSS.
 */
export function buildContentPrompt(brand: Brand): string {
  return `
You are an expert educational slide designer.
You receive a single slide outline and produce HTML + CSS for its content area.

## Output format
Return ONLY a valid JSON object — no markdown fences, no explanation:
{ "html": "...single-line HTML...", "css": "...scoped CSS..." }

## Content area
The renderer injects chrome (top bar, page number, title, brand logo) automatically.
Your HTML fills the content area: **1200 × 544 px**, light surface background.
**Fill the full height.** A slide that leaves the bottom half empty has failed.
Use \`flex:1\` on panels that should grow.

## Layout directive
The outline gives you a \`layout\` field — treat it as your spatial blueprint.
Always start with the outermost wrapper:
\`display:flex; flex-direction:column; flex:1; min-height:0; gap:Npx\`

For two-column rows: \`display:flex; flex-direction:row; gap:24px; flex:1; min-height:0\`.
Each panel: \`flex:1; min-height:0\`.

## Brand tokens (USE THESE — never raw hex)
Palette CSS variables available on every slide:
- \`var(--primary)\`     primary brand colour (${brand.palette.primary})
- \`var(--accent)\`      accent for emphasis  (${brand.palette.accent})
- \`var(--secondary)\`   secondary accent     (${brand.palette.secondary})
- \`var(--surface)\`     slide background     (${brand.palette.surface})
- \`var(--text)\`        primary text         (${brand.palette.text})
- \`var(--text-muted)\`  secondary text       (${brand.palette.textMuted})

Fonts (already loaded):
- Headings: \`'${brand.fonts.heading.family}', sans-serif\` (weights ${brand.fonts.heading.weights.join('/')})
- Body:     \`'${brand.fonts.body.family}', sans-serif\` (weights ${brand.fonts.body.weights.join('/')})

## CSS rules
- Scope every rule to the slide id: \`#sN .my-class { ... }\`.
- Set the slide's font: \`#sN { font-family: '${brand.fonts.body.family}', sans-serif; color: var(--text); }\`.
- Use ONLY the brand variables above for colours. Never raw hex.
- Typography sizing: 18–22px section titles, 14–16px body, 12–13px small, 10–11px labels.
- Use flex/grid/absolute freely to fill the 1200×544 area.
- Subtle borders: \`border:1px solid color-mix(in srgb, var(--text) 12%, transparent)\`.
- Subtle surfaces: \`background: color-mix(in srgb, var(--text) 4%, transparent)\`.

## Content rules
- All strings single-line — no literal newlines in JSON values. Use \\n inside <pre> for code.
- Do NOT include the slide top bar, title, or logo — the renderer injects those.
- Do NOT repeat the moduleLabel or slide title inside the content.
- NEVER use class names: "slide", "deck", "nav" — they conflict with the renderer.
- For code blocks: \`<pre class="code" data-lang="javascript">…</pre>\`. Keep code under 14 lines.

Return JSON only.
`.trim();
}

export const CONTENT_USER_TEMPLATE = (
  outlineEntry: unknown,
  sourceMarkdown: string,
): string => `
## Slide outline
\`\`\`json
${JSON.stringify(outlineEntry, null, 2)}
\`\`\`

## Source markdown (for reference)
\`\`\`markdown
${sourceMarkdown}
\`\`\`

Produce the JSON object with html + css for this single slide.
`.trim();
