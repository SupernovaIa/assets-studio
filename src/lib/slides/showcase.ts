import type { Slide } from '@/lib/slides/types.js';

/**
 * A static deck that exercises every component in the library, one per slide.
 * Useful as a dev-time visual regression target: hit /api/slides/showcase and
 * eyeball each component in isolation.
 */
export function buildShowcaseSlides(): Slide[] {
  const moduleLabel = 'COMPONENT LIBRARY';

  return [
    {
      type: 'cover',
      module: 'COMPONENT LIBRARY',
      title: 'Pre-styled components',
      subtitle: 'Visual catalogue of every class slides can compose',
    },

    {
      type: 'content',
      id: 'sc-typography',
      moduleLabel,
      title: 'Typography primitives',
      layout: 'showcase',
      items: 6,
      html: '<span class="label">Label · eyebrow · 10px / 700</span><div class="accent-line"></div><h3 class="hero">Hero heading · 28px / 700</h3><p class="body">Body text. Use this for paragraphs and any sustained reading. 14px line-height 1.7 — designed to be legible at slide distance without overpowering the layout.</p><p class="sub" style="margin-top:14px;">Sub: smaller, lighter, dimmed. Useful for captions or supporting context that should recede.</p><p class="dim" style="margin-top:8px;">.dim — same size as body but muted text colour for callouts and asides.</p>',
      css: '',
    },

    {
      type: 'content',
      id: 'sc-bullets',
      moduleLabel,
      title: 'Bullets + inline code',
      layout: 'showcase',
      items: 4,
      html: '<span class="label">.bullets</span><div class="accent-line"></div><ul class="bullets"><li>First bullet — accent dot before the text</li><li>Bullets inherit body typography (14px / 1.6)</li><li>Inline <code>code</code> renders as a tinted pill via <code>&lt;code&gt;</code></li><li>Use for lists where each item is a complete idea</li></ul>',
      css: '',
    },

    {
      type: 'content',
      id: 'sc-code',
      moduleLabel,
      title: '.code-block + syntax spans',
      layout: 'showcase',
      items: 1,
      html: '<span class="label">.code-block · .kw .str .cm .fg + .lang-badge</span><div class="accent-line"></div><pre class="code-block"><span class="lang-badge">PYTHON</span><span class="cm"># A minimal training step</span>\n<span class="kw">def</span> step(model, batch):\n    x, y = batch\n    pred = model(x)\n    loss = loss_fn(pred, y)\n    loss.backward()\n    optimizer.step()\n    <span class="kw">return</span> <span class="str">"ok"</span>, loss.item()</pre>',
      css: '#sc-code .code-block { margin-top:8px; }',
    },

    {
      type: 'content',
      id: 'sc-callouts',
      moduleLabel,
      title: 'Callouts: note · warn · success',
      layout: 'showcase',
      items: 3,
      html: '<span class="label">.callout.note · .callout.warn · .callout.success</span><div class="accent-line"></div><div class="callout note"><div class="icon">i</div><div><div class="callout-title">Nota informativa</div><div class="callout-body">Top border en accent, fondo accent-pale, icono circular. Usa para contexto neutro y tips.</div></div></div><div class="callout warn" style="margin-top:12px;"><div class="icon">!</div><div><div class="callout-title">Atención</div><div class="callout-body">Top border ámbar y fondo amarillo claro. Para advertencias y trampas comunes.</div></div></div><div class="callout success" style="margin-top:12px;"><div class="icon">✓</div><div><div class="callout-title">Confirmación</div><div class="callout-body">Top border verde. Para resultados positivos y buenas prácticas.</div></div></div>',
      css: '',
    },

    {
      type: 'content',
      id: 'sc-cards',
      moduleLabel,
      title: '.cards + .card',
      layout: 'showcase',
      items: 3,
      html: '<span class="label">3-column grid</span><div class="accent-line"></div><div class="cards"><div class="card"><div class="card-icon">◉</div><div class="card-title">Concepto</div><div class="card-body">Una tarjeta con icono, título corto en accent y un cuerpo en muted que explica el concepto.</div></div><div class="card"><div class="card-icon">≡</div><div class="card-title">Estructura</div><div class="card-body">El icono escala a 22px. Título uppercase, letter-spacing ligero. Cuerpo en 12.5px.</div></div><div class="card"><div class="card-icon">⚖</div><div class="card-title">Uso</div><div class="card-body">Ideal para 3 conceptos paralelos o una breve enumeración con peso visual.</div></div></div>',
      css: '#sc-cards .cards { margin-top:6px; }',
    },

    {
      type: 'content',
      id: 'sc-steps',
      moduleLabel,
      title: '.steps + .step-num',
      layout: 'showcase',
      items: 4,
      html: '<span class="label">Numbered process</span><div class="accent-line"></div><div class="steps"><div class="step"><div class="step-num">1</div><div class="step-text">Define el problema en una frase. Si no cabe, fragmenta antes de seguir.</div></div><div class="step"><div class="step-num">2</div><div class="step-text">Identifica las restricciones reales: latencia, presupuesto, equipo, datos.</div></div><div class="step"><div class="step-num">3</div><div class="step-text">Diseña el experimento mínimo que valida o invalida la hipótesis.</div></div><div class="step"><div class="step-num">4</div><div class="step-text">Mide, decide, documenta. Itera solo si el resultado es ambiguo.</div></div></div>',
      css: '#sc-steps .steps { margin-top:6px; }',
    },

    {
      type: 'content',
      id: 'sc-flow',
      moduleLabel,
      title: '.flow + .flow-node + .flow-arrow',
      layout: 'showcase',
      items: 4,
      html: '<span class="label">Horizontal process</span><div class="accent-line"></div><div class="flow"><div class="flow-node"><div class="fn-icon">▣</div><div class="fn-label">Datos</div><div class="fn-sub">Carga y limpieza</div></div><div class="flow-arrow">→</div><div class="flow-node"><div class="fn-icon">∇</div><div class="fn-label">Forward</div><div class="fn-sub">Predicción</div></div><div class="flow-arrow">→</div><div class="flow-node"><div class="fn-icon">∂</div><div class="fn-label">Loss</div><div class="fn-sub">Error vs target</div></div><div class="flow-arrow">→</div><div class="flow-node"><div class="fn-icon">↻</div><div class="fn-label">Backward</div><div class="fn-sub">Actualiza pesos</div></div></div>',
      css: '#sc-flow .flow { margin-top:10px; }',
    },

    {
      type: 'content',
      id: 'sc-comp',
      moduleLabel,
      title: '.comp-grid (yes/no comparison)',
      layout: 'showcase',
      items: 4,
      html: '<span class="label">Side-by-side comparison</span><div class="accent-line"></div><div class="comp-grid"><div class="comp-col yes"><div class="comp-header">Hazlo</div><div class="comp-body"><div class="comp-row">Componer clases existentes para mantener coherencia visual.</div><div class="comp-row">Usar variables de marca (--accent, --text) en lugar de hex.</div></div></div><div class="comp-col no"><div class="comp-header">Evítalo</div><div class="comp-body"><div class="comp-row">Redefinir tipografías o colores de los componentes.</div><div class="comp-row">Inventar clases que dupliquen lo que ya existe.</div></div></div></div>',
      css: '#sc-comp .comp-grid { margin-top:6px; }',
    },

    {
      type: 'content',
      id: 'sc-tag',
      moduleLabel,
      title: '.tag (pill label)',
      layout: 'showcase',
      items: 1,
      html: '<span class="label">Pill labels for categories or filters</span><div class="accent-line"></div><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;"><span class="tag">Backend</span><span class="tag">Infra</span><span class="tag">Observability</span><span class="tag">Security</span><span class="tag">Performance</span><span class="tag">Frontend</span></div><p class="body" style="margin-top:24px;">Background <code>var(--accent)</code>, foreground <code>var(--accent-ink)</code> — el ink se calcula a partir de la luminancia del accent, así que el contraste se mantiene en cualquier brand.</p>',
      css: '',
    },

    {
      type: 'thanks',
      text: 'Componer, no inventar.',
      tagline: 'Cada slide del deck reutiliza estas piezas.',
    },
  ];
}
