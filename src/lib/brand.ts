import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BRANDS_DIR = path.resolve(__dirname, '../../brands');

const LOGO_POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

const BrandJsonSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  palette: z.object({
    primary: z.string(),
    accent: z.string(),
    secondary: z.string(),
    surface: z.string(),
    text: z.string(),
    textMuted: z.string(),
  }),
  fonts: z.object({
    heading: z.object({
      family: z.string().min(1),
      weights: z.array(z.number().int().positive()).min(1),
    }),
    body: z.object({
      family: z.string().min(1),
      weights: z.array(z.number().int().positive()).min(1),
    }),
  }),
  logo: z
    .object({
      file: z.string().min(1),
      position: z.enum(LOGO_POSITIONS),
    })
    .optional(),
  infographic: z
    .object({
      styleHint: z.string().default(''),
    })
    .optional(),
  semanticPalette: z
    .object({
      success: z.string().optional(),
      warning: z.string().optional(),
      danger: z.string().optional(),
      accentPale: z.string().optional(),
      code: z
        .object({
          background: z.string().optional(),
          foreground: z.string().optional(),
          comment: z.string().optional(),
          string: z.string().optional(),
          keyword: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export interface SemanticPalette {
  success: string;
  warning: string;
  danger: string;
  accentPale: string;
  /**
   * Foreground colour to use on top of `accent` (e.g. text inside a step-num
   * circle, a tag pill, or a callout icon). Computed from the accent's
   * luminance so light accents pair with dark ink and dark accents with white.
   */
  accentInk: string;
  code: {
    background: string;
    foreground: string;
    comment: string;
    string: string;
    keyword: string;
  };
}

/**
 * Pick a foreground colour that contrasts with the given background hex.
 * Returns `darkInk` if the background is light, `#ffffff` otherwise.
 * Uses the WCAG relative-luminance threshold of 0.5.
 */
function pickInk(bgHex: string, darkInk: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(bgHex.trim());
  if (!m) return '#ffffff';
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? darkInk : '#ffffff';
}

export type BrandJson = z.infer<typeof BrandJsonSchema>;
export type LogoPosition = (typeof LOGO_POSITIONS)[number];

export interface Brand {
  name: string;
  displayName: string;
  palette: BrandJson['palette'];
  fonts: {
    heading: BrandJson['fonts']['heading'];
    body: BrandJson['fonts']['body'];
    googleFontsUrl: string;
  };
  logo: { dataUrl: string; position: LogoPosition } | null;
  extraCss: string;
  /**
   * Per-brand visual brief exemplar — a hand-tuned full prompt that has been
   * validated to render well in gpt-image-2 for this brand's aesthetic.
   * Falls back to the default brand's exemplar if the brand has none.
   * Empty string if neither is available.
   */
  briefExemplar: string;
  infographic: { styleHint: string };
  semantic: SemanticPalette;
}

export interface LoadBrandOptions {
  brandsDir?: string;
}

export const DEFAULT_BRAND_NAME = 'default';

function buildGoogleFontsUrl(fonts: BrandJson['fonts']): string {
  const families = [fonts.heading, fonts.body];
  // Dedupe families: same family with merged weights becomes one entry.
  const merged = new Map<string, Set<number>>();
  for (const f of families) {
    const set = merged.get(f.family) ?? new Set<number>();
    f.weights.forEach((w) => set.add(w));
    merged.set(f.family, set);
  }
  const params = Array.from(merged.entries())
    .map(([family, weights]) => {
      const sorted = Array.from(weights).sort((a, b) => a - b).join(';');
      return `family=${encodeURIComponent(family)}:wght@${sorted}`;
    })
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

async function readOptional(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

async function readBrandJson(brandDir: string): Promise<BrandJson> {
  const raw = await readFile(path.join(brandDir, 'brand.json'), 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in ${brandDir}/brand.json: ${(err as Error).message}`);
  }
  const result = BrandJsonSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid brand schema at ${brandDir}/brand.json: ${result.error.message}`);
  }
  return result.data;
}

async function loadBriefExemplar(brandsDir: string, brandDir: string): Promise<string> {
  const own = await readOptional(path.join(brandDir, 'brief-exemplar.txt'));
  if (own !== null) {
    return own.trim();
  }
  // Fall back to the default brand's exemplar (skip if this IS default).
  if (path.basename(brandDir) === DEFAULT_BRAND_NAME) {
    return '';
  }
  const fallback = await readOptional(
    path.join(brandsDir, DEFAULT_BRAND_NAME, 'brief-exemplar.txt'),
  );
  return fallback?.trim() ?? '';
}

async function normalize(brandsDir: string, brandDir: string, json: BrandJson): Promise<Brand> {
  let logo: Brand['logo'] = null;
  if (json.logo) {
    const buf = await readFile(path.join(brandDir, json.logo.file));
    const ext = path.extname(json.logo.file).slice(1).toLowerCase() || 'png';
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    logo = {
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
      position: json.logo.position,
    };
  }

  const extraCss = (await readOptional(path.join(brandDir, 'extra.css'))) ?? '';
  const briefExemplar = await loadBriefExemplar(brandsDir, brandDir);
  const sp = json.semanticPalette ?? {};
  const semantic: SemanticPalette = {
    success: sp.success ?? '#2E7D5A',
    warning: sp.warning ?? '#D4930A',
    danger: sp.danger ?? '#B03030',
    accentPale: sp.accentPale ?? `color-mix(in srgb, ${json.palette.accent} 14%, ${json.palette.surface})`,
    accentInk: pickInk(json.palette.accent, json.palette.primary),
    code: {
      background: sp.code?.background ?? '#0F1E28',
      foreground: sp.code?.foreground ?? '#A8D5CF',
      comment: sp.code?.comment ?? '#4E7A8C',
      string: sp.code?.string ?? '#F5C97A',
      keyword: sp.code?.keyword ?? '#7EB8F5',
    },
  };

  return {
    name: json.name,
    displayName: json.displayName,
    palette: json.palette,
    fonts: {
      heading: json.fonts.heading,
      body: json.fonts.body,
      googleFontsUrl: buildGoogleFontsUrl(json.fonts),
    },
    logo,
    extraCss,
    briefExemplar,
    infographic: { styleHint: json.infographic?.styleHint ?? '' },
    semantic,
  };
}

async function tryLoad(brandsDir: string, name: string): Promise<Brand | null> {
  const dir = path.join(brandsDir, name);
  try {
    const json = await readBrandJson(dir);
    return await normalize(brandsDir, dir, json);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

export async function loadBrand(name: string, opts: LoadBrandOptions = {}): Promise<Brand> {
  const brandsDir = opts.brandsDir ?? DEFAULT_BRANDS_DIR;
  const requested = await tryLoad(brandsDir, name);
  if (requested) {
    return requested;
  }
  if (name === DEFAULT_BRAND_NAME) {
    throw new Error(`Default brand not found at ${brandsDir}/${DEFAULT_BRAND_NAME}`);
  }
  const fallback = await tryLoad(brandsDir, DEFAULT_BRAND_NAME);
  if (!fallback) {
    throw new Error(`Brand "${name}" not found and default brand missing at ${brandsDir}`);
  }
  return fallback;
}

export interface BrandSummary {
  name: string;
  displayName: string;
}

export async function listBrands(opts: LoadBrandOptions = {}): Promise<BrandSummary[]> {
  const brandsDir = opts.brandsDir ?? DEFAULT_BRANDS_DIR;
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(brandsDir, { withFileTypes: true });
  const summaries: BrandSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    try {
      const json = await readBrandJson(path.join(brandsDir, entry.name));
      summaries.push({ name: json.name, displayName: json.displayName });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        // Folder without a brand.json — silently skip.
        continue;
      }
      console.warn(`[brand] skipping "${entry.name}": ${(err as Error).message}`);
    }
  }
  summaries.sort((a, b) => a.name.localeCompare(b.name));
  return summaries;
}
