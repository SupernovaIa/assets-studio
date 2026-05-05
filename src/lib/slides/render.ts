import type { Brand } from '@/lib/brand.js';
import type { ContentSlide, CoverSlide, SectionSlide, Slide, ThanksSlide } from '@/lib/slides/types.js';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const VOID_TAGS = new Set([
  'br', 'img', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed',
  'source', 'track', 'wbr',
]);

/**
 * LLM-generated HTML occasionally has mismatched tags (e.g. <p>...</div>).
 * A stray close cascades and breaks subsequent slides. This balancer:
 *  - drops stray close tags with no matching open
 *  - auto-closes unclosed tags at the end
 *  - when closing a tag, also closes any unclosed tags nested above it
 * Operates on tag positions only — text content is preserved verbatim.
 */
function balanceTags(html: string): string {
  const stack: string[] = [];
  const out: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const full = m[0];
    const name = m[1].toLowerCase();
    const isClose = full.startsWith('</');
    const isSelfClose = full.endsWith('/>') || VOID_TAGS.has(name);

    out.push(html.slice(lastIdx, m.index));
    if (isClose) {
      const idx = stack.lastIndexOf(name);
      if (idx !== -1) {
        while (stack.length > idx) {
          out.push(`</${stack.pop()}>`);
        }
      }
    } else if (isSelfClose) {
      out.push(full);
    } else {
      stack.push(name);
      out.push(full);
    }
    lastIdx = m.index + full.length;
  }
  out.push(html.slice(lastIdx));
  while (stack.length) {
    out.push(`</${stack.pop()}>`);
  }
  return out.join('');
}

function brandRootCss(brand: Brand): string {
  const s = brand.semantic;
  return `:root {
  --primary: ${brand.palette.primary};
  --accent: ${brand.palette.accent};
  --secondary: ${brand.palette.secondary};
  --surface: ${brand.palette.surface};
  --text: ${brand.palette.text};
  --text-muted: ${brand.palette.textMuted};
  --success: ${s.success};
  --warning: ${s.warning};
  --danger:  ${s.danger};
  --accent-pale: ${s.accentPale};
  --accent-ink:  ${s.accentInk};
  --code-bg: ${s.code.background};
  --code-fg: ${s.code.foreground};
  --code-cm: ${s.code.comment};
  --code-str: ${s.code.string};
  --code-kw: ${s.code.keyword};
  --rule: color-mix(in srgb, var(--text) 12%, transparent);
  --font-heading: '${brand.fonts.heading.family}', sans-serif;
  --font-body: '${brand.fonts.body.family}', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
}`;
}

const BASE_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 100%; height: 100%; background: #0a0a0b; overflow: hidden; font-family: var(--font-body); }

.deck-wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.deck { position: relative; width: 1280px; height: 720px; flex-shrink: 0; transform-origin: center center; }

.slide {
  position: absolute; inset: 0; overflow: hidden;
  background: var(--surface); color: var(--text);
  transform: translateX(1280px); opacity: 0; pointer-events: none;
  transition: transform 0.45s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.35s ease;
}
.slide.is-prev   { transform: translateX(-1280px); opacity: 0; }
.slide.is-active { transform: translateX(0);       opacity: 1; pointer-events: all; }

/* Cover */
.cover {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--surface)) 0%, var(--surface) 60%);
  display: flex; align-items: center; padding: 0 80px;
}
.cover .module-label {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 3px; text-transform: uppercase; color: var(--primary);
  opacity: 0.65; margin-bottom: 18px; display: block;
}
.cover h1 {
  font-family: var(--font-heading); font-size: 60px; font-weight: 700;
  color: var(--primary); line-height: 1.1; max-width: 920px; margin-bottom: 18px;
}
.cover .accent-bar { width: 48px; height: 3px; background: var(--accent); margin-bottom: 22px; }
.cover .subtitle {
  font-family: var(--font-body); font-size: 20px; color: var(--text-muted);
  max-width: 800px; line-height: 1.5;
}

/* Section */
.section-slide {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, var(--surface)) 0%, var(--surface) 70%);
  display: flex; align-items: center; padding: 0 80px;
}
.section-slide .num {
  font-family: var(--font-heading); font-size: 100px; font-weight: 700;
  color: var(--accent); opacity: 0.45; line-height: 1; display: block; margin-bottom: -8px;
}
.section-slide .label {
  font-family: var(--font-body); font-size: 11px; font-weight: 600;
  letter-spacing: 3px; text-transform: uppercase; color: var(--primary);
  opacity: 0.7; margin-bottom: 14px; display: block;
}
.section-slide h2 {
  font-family: var(--font-heading); font-size: 52px; font-weight: 700;
  color: var(--primary); line-height: 1.15; max-width: 800px;
}
.section-slide .accent-bar { width: 48px; height: 3px; background: var(--accent); margin-top: 24px; }

/* Content chrome — content slides always use the brand surface (white). */
.content {
  background: var(--surface);
  color: var(--text);
}

.content .top-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 56px;
  padding: 0 40px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--rule);
}
.content .module-label {
  font-family: var(--font-body); font-size: 10px; font-weight: 600;
  letter-spacing: 2.5px; text-transform: uppercase; color: var(--accent);
}
.content .page-num {
  font-family: var(--font-body); font-size: 11px; font-weight: 500;
  color: var(--text-muted);
}
.content h2 {
  position: absolute; top: 78px; left: 40px; right: 60px;
  font-family: var(--font-heading); font-size: 26px; font-weight: 700;
  color: var(--text); line-height: 1.25;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.content .content-area {
  position: absolute; top: 156px; left: 40px; right: 40px; bottom: 40px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.content .content-area > .slide-root {
  display: flex; flex-direction: column;
  flex: 1; min-height: 0;
  position: relative;
}

/* Thanks */
.thanks {
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--surface)) 0%, var(--surface) 60%);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
}
.thanks .accent-bar { width: 48px; height: 3px; background: var(--accent); }
.thanks h1 { font-family: var(--font-heading); font-size: 52px; font-weight: 700; color: var(--primary); }
.thanks p {
  font-family: var(--font-body); font-size: 18px; color: var(--text-muted);
  max-width: 600px; text-align: center; line-height: 1.5;
}

/* Navigation */
.nav {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 14px; z-index: 100;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 40px;
  padding: 9px 18px;
}
.nav button {
  background: none; border: none; color: #fff; font-size: 18px;
  cursor: pointer; opacity: 0.7; padding: 2px 8px; line-height: 1;
  transition: opacity 0.15s, transform 0.15s;
}
.nav button:hover:not(:disabled) { opacity: 1; transform: scale(1.15); }
.nav button:disabled { opacity: 0.2; cursor: default; }
.nav .counter {
  color: rgba(255,255,255,0.75); font-size: 12px; min-width: 48px;
  text-align: center; font-family: 'Inter', sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  .slide { transition: opacity 0.2s ease; transform: none !important; }
  .slide.is-prev, .slide:not(.is-active) { transform: none !important; }
}
`.trim();

/**
 * Pre-styled component library scoped to `.slide-root`. Slides compose these
 * classes rather than inventing CSS.
 */
const COMPONENT_CSS = `
.slide-root { font-family: var(--font-body); color: var(--text); }

/* Typography primitives */
.slide-root .label {
  display: block; font-size: 10px; font-weight: 700;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 12px;
}
.slide-root .body {
  font-size: 14px; font-weight: 400; line-height: 1.7;
  color: var(--text);
}
.slide-root .sub {
  font-size: 13px; font-weight: 300; line-height: 1.6;
  color: var(--text-muted);
}
.slide-root .dim { color: var(--text-muted); }
.slide-root .accent-line {
  width: 44px; height: 3px; background: var(--accent);
  border-radius: 2px; margin: 6px 0 14px;
}
.slide-root .hero {
  font-family: var(--font-heading);
  font-size: 28px; font-weight: 700; line-height: 1.2;
  color: var(--text); margin: 0 0 8px;
}

/* Bullets */
.slide-root .bullets { list-style: none; display: flex; flex-direction: column; gap: 10px; padding: 0; margin: 0; }
.slide-root .bullets li {
  position: relative; padding-left: 18px;
  font-size: 14px; line-height: 1.6; color: var(--text);
}
.slide-root .bullets li::before {
  content: ''; position: absolute; left: 0; top: 9px;
  width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
}

/* Inline code + code block */
.slide-root code {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  padding: 1px 6px; border-radius: 4px;
}
.slide-root .code-block {
  background: var(--code-bg); color: var(--code-fg);
  font-family: var(--font-mono); font-size: 12.5px; line-height: 1.65;
  padding: 18px 22px; border-radius: 8px;
  border-top: 2px solid var(--accent);
  white-space: pre; overflow: hidden;
  position: relative;
}
.slide-root .code-block .kw { color: var(--code-kw); }
.slide-root .code-block .str { color: var(--code-str); }
.slide-root .code-block .cm { color: var(--code-cm); font-style: italic; }
.slide-root .code-block .fg { color: var(--code-fg); }
.slide-root .code-block .lang-badge {
  position: absolute; top: 10px; right: 14px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
  color: var(--accent-ink); background: var(--accent);
  padding: 2px 10px; border-radius: 10px;
}

/* Callouts */
.slide-root .callout {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 14px 18px; border-radius: 8px;
}
.slide-root .callout .icon {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 1px;
}
.slide-root .callout .callout-title { font-size: 12px; font-weight: 700; margin-bottom: 3px; color: var(--text); }
.slide-root .callout .callout-body  { font-size: 12.5px; font-weight: 400; line-height: 1.6; color: var(--text-muted); }
.slide-root .callout.note {
  background: var(--accent-pale);
  border-top: 2.5px solid var(--accent);
}
.slide-root .callout.note .icon { background: var(--accent); color: var(--accent-ink); }
.slide-root .callout.warn {
  background: color-mix(in srgb, var(--warning) 12%, var(--surface));
  border-top: 2.5px solid var(--warning);
}
.slide-root .callout.warn .icon { background: var(--warning); color: #fff; }
.slide-root .callout.success {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  border-top: 2.5px solid var(--success);
}
.slide-root .callout.success .icon { background: var(--success); color: #fff; }

/* Cards (3-col grid) */
.slide-root .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.slide-root .card {
  background: color-mix(in srgb, var(--text) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: 10px; padding: 18px 20px;
}
.slide-root .card .card-icon { font-size: 22px; margin-bottom: 8px; color: var(--accent); }
.slide-root .card .card-title { font-size: 12px; font-weight: 700; color: var(--accent); margin-bottom: 6px; letter-spacing: 0.04em; text-transform: uppercase; }
.slide-root .card .card-body  { font-size: 12.5px; line-height: 1.6; color: var(--text-muted); }

/* Numbered steps */
.slide-root .steps { display: flex; flex-direction: column; gap: 12px; }
.slide-root .step  { display: flex; gap: 14px; align-items: flex-start; }
.slide-root .step-num {
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--accent); color: var(--accent-ink);
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.slide-root .step-text { font-size: 13.5px; line-height: 1.65; color: var(--text); }

/* yes/no comparison grid */
.slide-root .comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.slide-root .comp-col  { border-radius: 10px; overflow: hidden; }
.slide-root .comp-header {
  padding: 10px 16px; font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase; color: #fff;
}
.slide-root .comp-col.yes .comp-header { background: var(--success); }
.slide-root .comp-col.no  .comp-header { background: var(--danger);  }
.slide-root .comp-body { background: var(--surface); }
.slide-root .comp-row {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 10px 16px; font-size: 12.5px; color: var(--text);
  line-height: 1.5; border-bottom: 1px solid var(--rule);
}
.slide-root .comp-row:last-child { border-bottom: none; }

/* Horizontal flow diagram (process with arrows) */
.slide-root .flow {
  display: flex; align-items: stretch; gap: 0;
  flex-wrap: nowrap; overflow: hidden;
}
.slide-root .flow-node {
  background: var(--accent-pale);
  border: 1.5px solid var(--accent);
  border-radius: 10px;
  padding: 14px 16px; text-align: center;
  flex: 1 1 0; min-width: 0;
  display: flex; flex-direction: column; justify-content: center; gap: 4px;
}
.slide-root .flow-node .fn-icon  { font-size: 22px; color: var(--accent); }
.slide-root .flow-node .fn-label { font-size: 12px; font-weight: 700; color: var(--text); letter-spacing: 0.02em; }
.slide-root .flow-node .fn-sub   { font-size: 10.5px; color: var(--text-muted); line-height: 1.4; }
.slide-root .flow-arrow {
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--accent);
  padding: 0 10px; flex-shrink: 0;
}

/* Pill / tag (default + semantic variants) */
.slide-root .tag {
  display: inline-block;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  background: var(--accent); color: var(--accent-ink);
  padding: 4px 12px; border-radius: 20px;
}
.slide-root .tag.good {
  background: color-mix(in srgb, var(--success) 16%, var(--surface));
  color: var(--success);
}
.slide-root .tag.bad {
  background: color-mix(in srgb, var(--danger) 16%, var(--surface));
  color: var(--danger);
}
.slide-root .tag.warn {
  background: color-mix(in srgb, var(--warning) 18%, var(--surface));
  color: var(--warning);
}

/* Quote slide — decorative giant quote + statement + author */
.slide-root .quote-wrap {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; position: relative;
}
.slide-root .big-quote {
  position: absolute; top: -16px; left: -10px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 140px; font-weight: 800; line-height: 1;
  color: var(--accent); opacity: 0.16;
  pointer-events: none; user-select: none;
}
.slide-root .quote-text {
  position: relative; z-index: 1;
  font-size: 28px; font-weight: 600; line-height: 1.35;
  color: var(--text); max-width: 800px;
}
.slide-root .quote-author {
  margin-top: 22px; font-size: 13px; font-weight: 500;
  color: var(--accent);
  display: flex; align-items: center; gap: 12px;
}
.slide-root .quote-author::before {
  content: ''; display: block; width: 28px; height: 2px;
  background: var(--accent);
}

/* Stat / KPI grid */
.slide-root .stat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
}
.slide-root .stat-card {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-top: 3px solid var(--accent);
  border-radius: 10px;
  padding: 20px 22px;
  display: flex; flex-direction: column; gap: 6px;
}
.slide-root .stat-num {
  font-family: var(--font-heading);
  font-size: 40px; font-weight: 800; line-height: 1;
  color: var(--accent);
}
.slide-root .stat-label { font-size: 13px; font-weight: 700; color: var(--text); }
.slide-root .stat-sub   { font-size: 12px; font-weight: 400; color: var(--text-muted); line-height: 1.55; }

/* Pill list — alternative to .bullets, each item in a rounded chip */
.slide-root .pill-list { display: flex; flex-direction: column; gap: 10px; }
.slide-root .pill-item {
  display: flex; align-items: center; gap: 14px;
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: 40px; padding: 10px 18px;
  font-size: 13px; color: var(--text); line-height: 1.4;
}
.slide-root .pill-item .pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent); flex-shrink: 0;
}

/* Progress bars — labelled bar with gradient fill */
.slide-root .prog-list { display: flex; flex-direction: column; gap: 16px; }
.slide-root .prog-header {
  display: flex; justify-content: space-between; align-items: baseline;
  font-size: 12.5px; font-weight: 600; margin-bottom: 6px;
}
.slide-root .prog-label { color: var(--text); }
.slide-root .prog-val   { color: var(--accent); font-weight: 700; }
.slide-root .prog-bar {
  height: 6px; background: var(--rule);
  border-radius: 3px; overflow: hidden;
}
.slide-root .prog-fill {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--primary)));
}

/* Journey — process with arrows + per-step metric */
.slide-root .journey { display: flex; align-items: stretch; gap: 14px; }
.slide-root .j-step  { flex: 1; min-width: 0; position: relative; display: flex; }
.slide-root .j-step:not(:last-child)::after {
  content: '→'; position: absolute; right: -12px; top: 22px;
  font-size: 18px; color: var(--accent); z-index: 2;
}
.slide-root .j-card {
  flex: 1; display: flex; flex-direction: column; gap: 6px;
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: 10px;
  padding: 16px 14px;
}
.slide-root .j-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--accent); color: var(--accent-ink);
  font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.slide-root .j-title  { font-size: 13px; font-weight: 700; color: var(--text); margin-top: 4px; }
.slide-root .j-desc   { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; flex: 1; }
.slide-root .j-metric {
  margin-top: 4px; padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--accent);
}
`.trim();

const NAV_SCRIPT = `
(function() {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const total = slides.length;
  let i = 0;
  const cur = document.getElementById('cur');
  const tot = document.getElementById('tot');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  function show(n) {
    slides.forEach((s, idx) => {
      s.classList.remove('is-active', 'is-prev');
      if (idx === n) s.classList.add('is-active');
      else if (idx < n) s.classList.add('is-prev');
    });
    cur.textContent = n + 1;
    prev.disabled = n === 0;
    next.disabled = n === total - 1;
  }
  tot.textContent = total;
  show(0);
  prev.addEventListener('click', () => { if (i > 0) show(--i); });
  next.addEventListener('click', () => { if (i < total - 1) show(++i); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' && i > 0) show(--i);
    if (e.key === 'ArrowRight' && i < total - 1) show(++i);
  });
  const deck = document.querySelector('.deck');
  function scale() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    deck.style.transform = 'scale(' + s + ')';
  }
  scale();
  window.addEventListener('resize', scale);
})();
`.trim();

function renderCover(s: CoverSlide): string {
  const m = s.module ? `<span class="module-label">${escapeHtml(s.module)}</span>` : '';
  const sub = s.subtitle ? `<p class="subtitle">${escapeHtml(s.subtitle)}</p>` : '';
  return `<section class="slide cover">
  <div>
    ${m}
    <h1>${escapeHtml(s.title)}</h1>
    <div class="accent-bar"></div>
    ${sub}
  </div>
</section>`;
}

function renderSection(s: SectionSlide): string {
  const num = String(s.number).padStart(2, '0');
  const label = s.label ? `<span class="label">${escapeHtml(s.label)}</span>` : '';
  return `<section class="slide section-slide">
  <div>
    <span class="num">${escapeHtml(num)}</span>
    ${label}
    <h2>${escapeHtml(s.title)}</h2>
    <div class="accent-bar"></div>
  </div>
</section>`;
}

function renderContent(s: ContentSlide, page: number, total: number): string {
  const moduleLabel = s.moduleLabel ? escapeHtml(s.moduleLabel) : '';
  const pageStr = `${String(page).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
  // The slide root id lives on an INNER wrapper, never on the <section>.
  // If the LLM scopes its CSS as `#sN { position: relative; ... }` and that
  // selector matched the <section>, it would override `.slide`'s absolute
  // positioning and hide every content slide. Keeping the id off the section
  // isolates LLM CSS from the chrome.
  return `<section class="slide content" data-slide-id="${escapeHtml(s.id)}">
  <div class="top-bar">
    <span class="module-label">${moduleLabel}</span>
    <span class="page-num">${pageStr}</span>
  </div>
  <h2>${escapeHtml(s.title)}</h2>
  <div class="content-area"><div id="${escapeHtml(s.id)}" class="slide-root">${balanceTags(s.html)}</div></div>
</section>`;
}

function renderThanks(s: ThanksSlide): string {
  const tag = s.tagline ? `<p>${escapeHtml(s.tagline)}</p>` : '';
  return `<section class="slide thanks">
  <div class="accent-bar"></div>
  <h1>${escapeHtml(s.text)}</h1>
  ${tag}
</section>`;
}

function renderSlide(slide: Slide, page: number, total: number): string {
  switch (slide.type) {
    case 'cover':
      return renderCover(slide);
    case 'section':
      return renderSection(slide);
    case 'content':
      return renderContent(slide, page, total);
    case 'thanks':
      return renderThanks(slide);
  }
}

export interface RenderOptions {
  title?: string;
}

export function renderDeck(slides: Slide[], brand: Brand, opts: RenderOptions = {}): string {
  const title = opts.title ?? `${brand.displayName} — Deck`;
  const total = slides.length;
  const slidesHtml = slides.map((s, idx) => renderSlide(s, idx + 1, total)).join('\n');
  const llmCss = slides
    .filter((s): s is ContentSlide => s.type === 'content')
    .map((s) => s.css)
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link href="${escapeHtml(brand.fonts.googleFontsUrl)}" rel="stylesheet">
  <style>
${brandRootCss(brand)}

${BASE_CSS}

${COMPONENT_CSS}

${brand.extraCss}

/* ── LLM-generated per-slide CSS ────────────────────────────── */
${llmCss}
  </style>
</head>
<body>
  <div class="deck-wrap"><div class="deck">
${slidesHtml}
  </div></div>
  <nav class="nav">
    <button id="prev" aria-label="Previous">←</button>
    <span class="counter"><span id="cur">1</span> / <span id="tot">1</span></span>
    <button id="next" aria-label="Next">→</button>
  </nav>
  <script>
${NAV_SCRIPT}
  </script>
</body>
</html>
`;
}
