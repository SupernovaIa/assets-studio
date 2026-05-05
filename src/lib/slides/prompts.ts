import type { Brand } from '@/lib/brand.js';

/**
 * Single-call prompt: the LLM receives the full markdown and returns the entire
 * deck as a JSON array. Coherence between slides emerges naturally because one
 * call sees what it just wrote — no parallel divergence.
 *
 * Inspiration: AI4Slides' `lib/prompts/html.js` (short prompt + concrete
 * few-shot examples beats long prose-heavy editorial guidelines).
 */
export function buildSlidesPrompt(brand: Brand): string {
  return `
You are an expert editorial slide designer producing a complete educational deck.

## Output format
Return ONLY a valid JSON array — no markdown fences, no prose. Each item is a slide object.

### Slide types

**cover** (first slide, exactly one):
{ "type": "cover", "module": "MÓDULO 1", "title": "...", "subtitle": "..." }

**section** (one per top-level H1 in the source):
{ "type": "section", "number": 1, "label": "UNIDAD 1", "title": "..." }

**content** (8–12 of these, the body of the deck):
{
  "type": "content",
  "id": "s2",
  "moduleLabel": "MÓDULO 1 · TEMA 1",
  "title": "Slide title",
  "layout": "two-col",
  "items": 4,
  "html": "<single-line html>",
  "css": "<scoped css>"
}

**thanks** (last slide, exactly one):
{ "type": "thanks", "text": "¡Hasta la próxima!", "tagline": "..." }

The renderer auto-injects chrome:
- cover/section/thanks: gradient background, large title, accent bar — just provide the text.
- content slides: top bar (module label + page number), slide title, brand logo. Your "html" is wrapped in a \`<div id="sN" class="slide-root">\` that ALREADY has \`display:flex; flex-direction:column; flex:1; min-height:0; position:relative;\`. The available area is 1200 × 524 px, surface background, \`overflow:hidden\`. Do NOT redefine those base properties on \`#sN\` — only add what you need (gap, padding, justify-content, etc).

## Brand
Palette CSS variables (use these — never raw hex):
- \`var(--primary)\`     ${brand.palette.primary}
- \`var(--accent)\`      ${brand.palette.accent}
- \`var(--secondary)\`   ${brand.palette.secondary}
- \`var(--surface)\`     ${brand.palette.surface}
- \`var(--text)\`        ${brand.palette.text}
- \`var(--text-muted)\`  ${brand.palette.textMuted}

Fonts (already loaded — always quote the family):
- Headings: '${brand.fonts.heading.family}', sans-serif
- Body:     '${brand.fonts.body.family}', sans-serif

## Style — editorial restraint
- Whitespace is the primary tool. Tinted surfaces only when truly necessary (code blocks).
- ONE visual focus per slide. No KPI-soup, no decorative footer pills, no eyebrow longer than 4 words.
- Accent appears AT MOST ONCE per slide — the single most important element. Never on borders, never as background tint on multiple things.
- **Three sizes max**: HERO (28–48px / 700), BODY (14–16px / 400–500), LABEL (10–12px / 600 uppercase muted).
- **Reuse class vocabulary across slides.** Pick canonical names like \`.label\`, \`.hero\`, \`.body\`, \`.col\`, \`.step\`, \`.code\`, \`.mono\` — and use the SAME font-size for the same name in every slide. Consistency between slides matters as much as quality of any single slide.

## Layout values for content slides
\`two-col\` · \`three-col\` · \`steps\` · \`concept+code\` · \`single\` · \`table\` · \`quote\` · \`metrics\`

## Hard caps
- 8–12 content slides total. Split rather than cram.
- Items per slide ≤ 5 (the "items" field is a CEILING — never exceed it in the html).
- Body text ≤ 350 chars per slide.
- Code blocks: ≤ 8 lines, ≤ 80 chars/line, monospace, subtle background, NO border.
- Tables: ≤ 4 rows × ≤ 4 cols.

## CSS / HTML rules
- **HTML tag balance is CRITICAL.** Every \`<div>\` needs a matching \`</div>\`, every \`<p>\` a \`</p>\`, every \`<span>\` a \`</span>\`. A SINGLE mismatched tag cascades and breaks subsequent slides. Re-read each slide's html before emitting and count opens vs closes.
- All CSS scoped: every rule prefixed with \`#sN\` (e.g. \`#s2 .label { ... }\`).
- Slide root: \`#sN { font-family: '${brand.fonts.body.family}', sans-serif; color: var(--text); }\`.
- Code block style: \`background: color-mix(in srgb, var(--text) 5%, transparent); padding: 18px 22px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6;\` (NO border).
- Hairline divider when needed: \`border-top: 1px solid color-mix(in srgb, var(--text) 10%, transparent);\`.
- Always set \`min-height: 0\` on flex children so they shrink under pressure.
- **Fill the canvas.** The slide root should be \`display:flex; flex-direction:column; height:100%;\` (or use \`flex:1\` on a wrapper) so content occupies the full 524px height. Avoid leaving large empty bands at the bottom — distribute spacing with \`gap\` and \`justify-content\` instead of letting content stack at the top.
- All HTML / CSS strings on a SINGLE LINE — use \\\\n inside \`<pre>\` for code only.
- Do NOT include slide title or top bar inside the html (renderer injects them).
- NEVER use class names: "slide", "deck", "nav", or repeat the slide id as a class.

## Example output (showing 2 content slides — note shared typography)

\`\`\`json
[
  { "type": "cover", "module": "MÓDULO 1", "title": "Introducción a las redes neuronales", "subtitle": "Fundamentos y casos de uso" },
  { "type": "section", "number": 1, "label": "UNIDAD 1", "title": "¿Qué es una red neuronal?" },
  {
    "type": "content", "id": "s2", "moduleLabel": "MÓDULO 1 · TEMA 1",
    "title": "Tres conceptos clave", "layout": "three-col", "items": 3,
    "html": "<div class=\\"row\\"><div class=\\"col\\"><span class=\\"label\\">01</span><h3 class=\\"hero\\">Neurona</h3><p class=\\"body\\">Unidad básica que recibe entradas, las pondera y emite una salida.</p></div><div class=\\"col\\"><span class=\\"label\\">02</span><h3 class=\\"hero\\">Capa</h3><p class=\\"body\\">Conjunto de neuronas en paralelo. Las redes apilan varias en serie.</p></div><div class=\\"col\\"><span class=\\"label\\">03</span><h3 class=\\"hero\\">Pesos</h3><p class=\\"body\\">Parámetros aprendidos que determinan la fuerza de cada conexión.</p></div></div>",
    "css": "#s2 .row { display:flex; gap:48px; flex:1; min-height:0; align-items:flex-start; padding-top:8px; } #s2 .col { flex:1; min-width:0; } #s2 .label { display:block; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-muted); margin-bottom:14px; } #s2 .hero { font-family:'${brand.fonts.heading.family}', sans-serif; font-size:24px; font-weight:700; color:var(--text); line-height:1.25; margin:0 0 10px; } #s2 .body { font-size:15px; color:var(--text); line-height:1.55; margin:0; }"
  },
  {
    "type": "content", "id": "s3", "moduleLabel": "MÓDULO 1 · TEMA 1",
    "title": "Forward pass mínimo", "layout": "concept+code", "items": 2,
    "html": "<div class=\\"row\\"><div class=\\"left\\"><span class=\\"label\\">FORWARD PASS</span><p class=\\"body\\">Cada capa multiplica la entrada por sus pesos, suma el sesgo y aplica una activación. La salida de una capa es la entrada de la siguiente.</p></div><pre class=\\"code\\"><span class=\\"kw\\">import</span> torch.nn <span class=\\"kw\\">as</span> nn\\n\\nlayer = nn.Linear(<span class=\\"num\\">10</span>, <span class=\\"num\\">5</span>)\\nx = torch.randn(<span class=\\"num\\">1</span>, <span class=\\"num\\">10</span>)\\ny = layer(x)</pre></div>",
    "css": "#s3 .row { display:flex; gap:40px; flex:1; min-height:0; align-items:stretch; padding-top:8px; } #s3 .left { flex:0 0 38%; display:flex; flex-direction:column; justify-content:center; } #s3 .label { display:block; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-muted); margin-bottom:16px; } #s3 .body { font-size:15px; color:var(--text); line-height:1.6; margin:0; } #s3 .code { flex:1; min-width:0; background:color-mix(in srgb, var(--text) 5%, transparent); padding:18px 22px; border-radius:6px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:13px; line-height:1.6; color:var(--text); white-space:pre; overflow:hidden; margin:0; } #s3 .code .kw { color:var(--accent); font-weight:600; } #s3 .code .num { color:var(--text); font-weight:600; }"
  },
  { "type": "thanks", "text": "¡Hasta la próxima!", "tagline": "Gracias por seguir aprendiendo." }
]
\`\`\`

Notice in the example: BOTH content slides use the SAME \`.label\` (11px / 600 / uppercase / muted) and the SAME \`.body\` (15px / line-height 1.55–1.6). Maintain this kind of consistency across ALL your slides — reuse class names and sizes, vary the layout, not the typography.

Return the JSON array now.
`.trim();
}

/**
 * Edit prompt for a single content slide. Receives the current slide + chat
 * history + a new instruction, returns updated html/css plus a one-line summary.
 */
export function buildEditPrompt(brand: Brand): string {
  return `
You are editing a single slide in an educational deck. Honour the same editorial restraint as the original deck.

## Brand
Palette CSS variables (never raw hex):
- \`var(--primary)\`     ${brand.palette.primary}
- \`var(--accent)\`      ${brand.palette.accent}
- \`var(--secondary)\`   ${brand.palette.secondary}
- \`var(--surface)\`     ${brand.palette.surface}
- \`var(--text)\`        ${brand.palette.text}
- \`var(--text-muted)\`  ${brand.palette.textMuted}

Fonts (always quoted):
- Headings: '${brand.fonts.heading.family}', sans-serif
- Body:     '${brand.fonts.body.family}', sans-serif

## Style rules to preserve
- Whitespace > boxes. ONE visual focus per slide. Accent at most once.
- Three sizes max: HERO (28–48px / 700), BODY (14–16px / 400–500), LABEL (10–12px / 600 uppercase muted).
- Class vocabulary: \`.label\`, \`.hero\`, \`.body\`, \`.col\`, \`.step\`, \`.code\`, \`.mono\`. Reuse, do not reinvent.
- Code blocks: subtle background, no border, monospace, ≤ 8 lines.
- Content area: 1200 × 524 px, \`overflow:hidden\`.
- CSS scoped to \`#sN\`. Single-line strings.

## Mode
You receive: the current slide \`{ id, title, layout, html, css }\` + chat history + a new instruction.
Apply the new instruction. Keep prior accepted edits unless explicitly asked to undo. Return ONLY this JSON:

{ "summary": "...", "html": "...", "css": "..." }

- \`summary\`: ≤ 20-word Spanish sentence describing the change. Becomes the assistant's chat reply.
- \`html\` / \`css\`: the FULL updated slide (not a diff). Same single-line / scoping rules.

Return JSON only — no fences, no prose.
`.trim();
}

export const EDIT_USER_TEMPLATE = (
  slide: { id: string; title: string; layout: string; html: string; css: string },
  chat: ReadonlyArray<{ role: string; content: string }>,
  message: string,
): string => `
## Current slide
\`\`\`json
${JSON.stringify(slide, null, 2)}
\`\`\`

## Chat history (previous accepted edits)
${chat.length === 0 ? '(empty)' : chat.map((m) => `- ${m.role}: ${m.content}`).join('\n')}

## New instruction
${message}

Produce the JSON object now.
`.trim();
