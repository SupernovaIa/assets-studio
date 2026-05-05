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
  return `:root {
  --primary: ${brand.palette.primary};
  --accent: ${brand.palette.accent};
  --secondary: ${brand.palette.secondary};
  --surface: ${brand.palette.surface};
  --text: ${brand.palette.text};
  --text-muted: ${brand.palette.textMuted};
  --font-heading: '${brand.fonts.heading.family}', sans-serif;
  --font-body: '${brand.fonts.body.family}', sans-serif;
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

/* Content chrome */
.content { background: var(--surface); }
.content .top-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 56px;
  padding: 0 40px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid color-mix(in srgb, var(--text) 12%, transparent);
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
  /* Cap the title to 2 lines so a long heading cannot push into the content area. */
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
