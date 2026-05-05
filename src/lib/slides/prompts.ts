import type { Brand } from '@/lib/brand.js';

/**
 * Single-call prompt: minimal scaffolding (output schema + brand + chrome
 * contract + non-negotiables) plus two concrete few-shot examples that carry
 * the editorial signal. Number of slides, layouts, density, and decoration are
 * the LLM's call — guided by examples, not by rules.
 */
export function buildSlidesPrompt(brand: Brand): string {
  return `
You are an expert editorial slide designer. Given a markdown source, produce a complete educational deck as a JSON array.

## Output
Return ONLY a JSON array — no fences, no prose. Slide types:

- **cover** (first): \`{ "type": "cover", "module": "...", "title": "...", "subtitle": "..." }\`
- **section** (one per H1): \`{ "type": "section", "number": 1, "label": "UNIDAD 1", "title": "..." }\`
- **content**: \`{ "type": "content", "id": "sN", "moduleLabel": "...", "title": "...", "layout": "<your label>", "items": N, "html": "...", "css": "..." }\`
- **thanks** (last): \`{ "type": "thanks", "text": "...", "tagline": "..." }\`

The renderer auto-injects chrome:
- cover/section/thanks: gradient background + large title + accent bar — provide text only.
- content slides: top bar (module label + page number), slide title, brand logo. Your "html" is wrapped in \`<div id="sN" class="slide-root">\` which already has \`display:flex; flex-direction:column; flex:1; min-height:0; justify-content:center; position:relative;\` — content is vertically centred by default. The drawing area is **1200 × 524 px**, surface background, \`overflow:hidden\`. Don't redefine those base properties (override \`justify-content\` only if a top- or space-between-anchored layout is intentional).

## Brand
Palette CSS variables (use these — never raw hex):
- \`var(--primary)\`     ${brand.palette.primary}
- \`var(--accent)\`      ${brand.palette.accent}
- \`var(--secondary)\`   ${brand.palette.secondary}
- \`var(--surface)\`     ${brand.palette.surface}
- \`var(--text)\`        ${brand.palette.text}
- \`var(--text-muted)\`  ${brand.palette.textMuted}

Fonts (already loaded — always quote):
- Headings: '${brand.fonts.heading.family}', sans-serif
- Body:     '${brand.fonts.body.family}', sans-serif

## You decide
- **How many content slides** the source warrants. Don't pad. A short source → a short deck.
- **The layout** for each slide (two columns, hero number, code+concept, list, table, quote, metrics, full-bleed statement — whatever fits the content). The "layout" field is just a label you choose for your own reference.

## The "sparse slide" test — apply BEFORE emitting each content slide

Picture the slide rendered at 1200 × 524 px with the content you're about to emit. Ask: **would this look empty?** If yes, you have THREE options — pick one, never just centre tiny content on a large canvas:

1. **Cut the slide.** If the idea is so small it can't fill 1200 × 524 with substance OR with deliberate scale, it isn't a slide. It's a sentence in another slide. Drop it.
2. **Merge it with an adjacent slide.** Two thin slides on related ideas → one solid slide that compares them.
3. **Commit to scale.** A slide with one short sentence is fine — but only if you make that sentence a HERO at 36–56 px / 700, occupying the canvas as a deliberate statement. Two sentences at 14 px floating in the middle is the failure mode you must avoid.

Concrete rule of thumb:
- 1 sentence at body size (14–16 px) → not a slide, fold it into a neighbour.
- 1 sentence at hero size (36–56 px) → great slide.
- 3+ items / a full grid / a code block / a comparison → great slide at body size.
- 2 short bullets centred on white space → failure. Cut, merge, or escalate the typography.

When in doubt: **fewer slides, denser slides** wins.

## Non-negotiables
- All CSS scoped to the slide id: \`#s2 .my-class { ... }\`. Slide root: \`#sN { font-family: '${brand.fonts.body.family}', sans-serif; color: var(--text); }\`.
- **Reuse class vocabulary across slides.** Settle on canonical names (\`.label\`, \`.body\`, \`.hero\`, \`.col\`, \`.step\`, \`.code\`, \`.mono\`) and use the SAME font-size / weight / color for the same name on every slide. Consistency between slides matters as much as the quality of any single slide.
- **Balanced HTML.** Every \`<div>\` matched with \`</div>\`, every \`<p>\` with \`</p>\`. A stray close cascades and breaks subsequent slides — count opens vs closes before emitting each slide.
- All html and css strings on a SINGLE LINE. Use \\\\n only inside \`<pre>\` for code.
- Don't include the slide title or top bar inside the html (renderer injects them).
- Forbidden class names: \`slide\`, \`deck\`, \`nav\`. Don't repeat the slide id as a class.
- Use only CSS variables from the palette — no raw hex.
- **Don't put \`flex:1\` on the outer row unless you genuinely need columns to stretch to full canvas height** (e.g. code panel that must fill). For most layouts, let the row size to its content and the slide-root will centre it vertically. \`flex:1; min-height:0\` on the row defeats the default centring.

## Examples — note the SAME .label and .body sizes on both slides

\`\`\`json
[
  { "type": "cover", "module": "MÓDULO 1", "title": "Introducción a las redes neuronales", "subtitle": "Fundamentos y casos de uso" },
  { "type": "section", "number": 1, "label": "UNIDAD 1", "title": "¿Qué es una red neuronal?" },
  {
    "type": "content", "id": "s2", "moduleLabel": "MÓDULO 1 · TEMA 1",
    "title": "Tres conceptos clave", "layout": "three-col", "items": 3,
    "html": "<div class=\\"row\\"><div class=\\"col\\"><span class=\\"label\\">01</span><h3 class=\\"hero\\">Neurona</h3><p class=\\"body\\">Unidad básica que recibe entradas, las pondera y emite una salida.</p></div><div class=\\"col\\"><span class=\\"label\\">02</span><h3 class=\\"hero\\">Capa</h3><p class=\\"body\\">Conjunto de neuronas en paralelo. Las redes apilan varias en serie.</p></div><div class=\\"col\\"><span class=\\"label\\">03</span><h3 class=\\"hero\\">Pesos</h3><p class=\\"body\\">Parámetros aprendidos que determinan la fuerza de cada conexión.</p></div></div>",
    "css": "#s2 .row { display:flex; gap:48px; align-items:flex-start; } #s2 .col { flex:1; min-width:0; } #s2 .label { display:block; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-muted); margin-bottom:14px; } #s2 .hero { font-family:'${brand.fonts.heading.family}', sans-serif; font-size:24px; font-weight:700; color:var(--text); line-height:1.25; margin:0 0 10px; } #s2 .body { font-size:15px; color:var(--text); line-height:1.55; margin:0; }"
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

Return the JSON array now.
`.trim();
}

/**
 * Edit prompt for a single content slide. Same brand contract; the user message
 * supplies the current slide + chat history + new instruction.
 */
export function buildEditPrompt(brand: Brand): string {
  return `
You are editing a single slide in an educational deck.

## Brand
Palette CSS variables (use these — never raw hex):
- \`var(--primary)\`     ${brand.palette.primary}
- \`var(--accent)\`      ${brand.palette.accent}
- \`var(--secondary)\`   ${brand.palette.secondary}
- \`var(--surface)\`     ${brand.palette.surface}
- \`var(--text)\`        ${brand.palette.text}
- \`var(--text-muted)\`  ${brand.palette.textMuted}

Fonts:
- Headings: '${brand.fonts.heading.family}', sans-serif
- Body:     '${brand.fonts.body.family}', sans-serif

## Constraints
- CSS scoped to \`#sN\`. Single-line html/css. Balanced tags.
- Reuse the existing class vocabulary on the slide; don't reinvent typography.
- Content area is 1200 × 524 px, \`overflow:hidden\`.

## Mode
You receive the current slide \`{ id, title, layout, html, css }\` + chat history + a new instruction. Apply the instruction; keep prior accepted edits unless asked to undo. Return ONLY:

\`{ "summary": "...", "html": "...", "css": "..." }\`

- \`summary\`: ≤ 20-word Spanish sentence. Becomes the chat reply.
- \`html\` / \`css\`: the FULL updated slide (not a diff).
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
