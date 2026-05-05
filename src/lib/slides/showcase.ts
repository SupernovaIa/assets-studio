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
      id: 'sc-quote',
      moduleLabel,
      title: '.quote-wrap (hero quote slide)',
      layout: 'showcase',
      items: 1,
      html: '<div class="quote-wrap"><div class="big-quote">"</div><blockquote class="quote-text">Composability beats configurability. Every time you let someone configure a thing, you take a knob away from the next person.</blockquote><div class="quote-author">Pieter Hintjens — ZeroMQ author</div></div>',
      css: '',
    },

    {
      type: 'content',
      id: 'sc-stat',
      moduleLabel,
      title: '.stat-grid + .stat-card (KPIs)',
      layout: 'showcase',
      items: 3,
      html: '<span class="label">North-star metrics</span><div class="accent-line"></div><div class="stat-grid"><div class="stat-card"><div class="stat-num">94%</div><div class="stat-label">Retention 30d</div><div class="stat-sub">Usuarios activos un mes después del onboarding</div><span class="tag good" style="margin-top:6px;">Saludable</span></div><div class="stat-card"><div class="stat-num">2.4×</div><div class="stat-label">LTV / CAC</div><div class="stat-sub">Valor de vida sobre coste de adquisición</div><span class="tag warn" style="margin-top:6px;">Vigilar</span></div><div class="stat-card"><div class="stat-num">18%</div><div class="stat-label">Churn anual</div><div class="stat-sub">Bajas voluntarias en los últimos 12 meses</div><span class="tag bad" style="margin-top:6px;">Crítico</span></div></div>',
      css: '#sc-stat .stat-grid { margin-top:8px; }',
    },

    {
      type: 'content',
      id: 'sc-journey',
      moduleLabel,
      title: '.journey (process with arrows + metrics)',
      layout: 'showcase',
      items: 4,
      html: '<span class="label">Funnel de activación</span><div class="accent-line"></div><div class="journey"><div class="j-step"><div class="j-card"><div class="j-num">1</div><div class="j-title">Sign-up</div><div class="j-desc">El usuario crea cuenta con email o SSO.</div><div class="j-metric">100%</div></div></div><div class="j-step"><div class="j-card"><div class="j-num">2</div><div class="j-title">Onboarding</div><div class="j-desc">Tutorial interactivo de tres pasos clave.</div><div class="j-metric">72%</div></div></div><div class="j-step"><div class="j-card"><div class="j-num">3</div><div class="j-title">First value</div><div class="j-desc">Completa la primera acción significativa.</div><div class="j-metric">48%</div></div></div><div class="j-step"><div class="j-card"><div class="j-num">4</div><div class="j-title">Habit</div><div class="j-desc">Vuelve por su cuenta tres veces en 7 días.</div><div class="j-metric">31%</div></div></div></div>',
      css: '#sc-journey .journey { margin-top:8px; }',
    },

    {
      type: 'content',
      id: 'sc-tag',
      moduleLabel,
      title: '.tag (pill label)',
      layout: 'showcase',
      items: 1,
      html: '<span class="label">Default + semantic variants</span><div class="accent-line"></div><div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:8px;"><span class="tag">Backend</span><span class="tag">Infra</span><span class="tag">Frontend</span><span class="tag good">Saludable</span><span class="tag warn">Vigilar</span><span class="tag bad">Crítico</span></div><p class="body" style="margin-top:22px;">El tag default usa <code>var(--accent)</code> como fondo y <code>var(--accent-ink)</code> (calculado por luminancia) como texto. Las variantes <code>.good</code>, <code>.warn</code> y <code>.bad</code> tintan el fondo con el color semántico al 16-18% sobre la superficie y usan ese mismo color como texto.</p>',
      css: '',
    },

    {
      type: 'thanks',
      text: 'Componer, no inventar.',
      tagline: 'Cada slide del deck reutiliza estas piezas.',
    },
  ];
}
