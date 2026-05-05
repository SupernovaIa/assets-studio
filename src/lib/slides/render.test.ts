import { describe, expect, it } from 'vitest';

import { loadBrand } from '@/lib/brand.js';
import { renderDeck } from '@/lib/slides/render.js';
import { buildShowcaseSlides } from '@/lib/slides/showcase.js';

/**
 * Lightweight visual regression for the component library: rendering the
 * showcase deck must include every component class. If a CSS rule is renamed
 * or accidentally dropped from COMPONENT_CSS, this catches it before a human
 * has to open the browser.
 */
describe('renderDeck(showcase)', () => {
  it('emits every component class for the thepower brand', async () => {
    const brand = await loadBrand('thepower');
    const html = renderDeck(buildShowcaseSlides(), brand);

    // Chrome
    expect(html).toContain('class="slide content"');
    expect(html).toContain('class="slide-footer"');
    expect(html).toContain('class="footer-logo"'); // thepower has a logo

    // Brand vars
    expect(html).toContain('--accent: #82C4AF');
    expect(html).toContain('--accent-ink:');
    expect(html).toContain('--accent-pale:');

    // Component CSS rules
    for (const selector of [
      '.slide-root .label',
      '.slide-root .body',
      '.slide-root .accent-line',
      '.slide-root .hero',
      '.slide-root .bullets',
      '.slide-root .code-block',
      '.slide-root .callout',
      '.slide-root .cards',
      '.slide-root .card ',
      '.slide-root .steps',
      '.slide-root .step-num',
      '.slide-root .flow-node',
      '.slide-root .flow-arrow',
      '.slide-root .journey',
      '.slide-root .j-card',
      '.slide-root .j-num',
      '.slide-root .j-metric',
      '.slide-root .comp-grid',
      '.slide-root .stat-grid',
      '.slide-root .stat-num',
      '.slide-root .quote-wrap',
      '.slide-root .big-quote',
      '.slide-root .pill-list',
      '.slide-root .prog-bar',
      '.slide-root .tag',
      '.slide-root .tag.good',
      '.slide-root .tag.bad',
      '.slide-root .tag.warn',
    ]) {
      expect(html, `missing CSS rule: ${selector}`).toContain(selector);
    }

    // Showcase markup actually exercises the components in slide html
    for (const marker of [
      'class="callout',
      'class="cards"',
      'class="steps"',
      'class="flow"',
      'class="journey"',
      'class="comp-grid"',
      'class="stat-grid"',
      'class="quote-wrap"',
      'class="pill-list"',
      'class="prog-list"',
    ]) {
      expect(html, `missing showcase markup: ${marker}`).toContain(marker);
    }
  });

  it('omits the footer logo when showLogo is false', async () => {
    const brand = await loadBrand('thepower');
    const html = renderDeck(buildShowcaseSlides(), brand, { showLogo: false });
    expect(html).not.toContain('class="footer-logo"');
    // Footer itself stays — only the logo image is suppressed.
    expect(html).toContain('class="slide-footer"');
    expect(html).toContain('class="footer-page"');
  });

  it('uses brand surface as content background regardless of brand', async () => {
    const def = await loadBrand('default');
    const html = renderDeck(buildShowcaseSlides(), def);
    // default brand has no logo → no img element, but footer still renders
    expect(html).not.toContain('class="footer-logo"');
    expect(html).toContain('class="slide-footer"');
    expect(html).toContain('--surface: #FFFFFF');
  });
});
