import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listBrands, loadBrand } from '@/lib/brand.js';

describe('loadBrand (real brands/)', () => {
  it('loads the default brand without a logo', async () => {
    const brand = await loadBrand('default');
    expect(brand.name).toBe('default');
    expect(brand.logo).toBeNull();
    expect(brand.fonts.googleFontsUrl).toContain('family=Inter');
    expect(brand.fonts.googleFontsUrl).toContain('display=swap');
  });

  it('loads thepower with a base64 logo dataUrl', async () => {
    const brand = await loadBrand('thepower');
    expect(brand.name).toBe('thepower');
    expect(brand.displayName).toBe('The Power');
    expect(brand.palette.primary).toBe('#1C3C42');
    expect(brand.logo).not.toBeNull();
    expect(brand.logo?.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(brand.logo?.position).toBe('bottom-right');
    expect(brand.fonts.googleFontsUrl).toContain('family=Sora');
    expect(brand.fonts.googleFontsUrl).toContain('family=Poppins');
  });

  it('falls back to default when the brand does not exist', async () => {
    const brand = await loadBrand('does-not-exist');
    expect(brand.name).toBe('default');
  });
});

describe('listBrands (real brands/)', () => {
  it('lists default and thepower', async () => {
    const brands = await listBrands();
    const names = brands.map((b) => b.name);
    expect(names).toContain('default');
    expect(names).toContain('thepower');
  });
});

describe('loadBrand (fixtures)', () => {
  let fixturesDir: string;

  beforeAll(async () => {
    fixturesDir = await mkdtemp(path.join(tmpdir(), 'slides-studio-brand-'));

    // A brand whose JSON is missing required fields.
    const badDir = path.join(fixturesDir, 'broken');
    await mkdir(badDir, { recursive: true });
    await writeFile(
      path.join(badDir, 'brand.json'),
      JSON.stringify({ name: 'broken' }),
      'utf8',
    );

    // A minimal valid default to allow fallback in this fixture dir.
    const defaultDir = path.join(fixturesDir, 'default');
    await mkdir(defaultDir, { recursive: true });
    await writeFile(
      path.join(defaultDir, 'brand.json'),
      JSON.stringify({
        name: 'default',
        displayName: 'Default',
        palette: {
          primary: '#000',
          accent: '#000',
          secondary: '#000',
          surface: '#fff',
          text: '#000',
          textMuted: '#666',
        },
        fonts: {
          heading: { family: 'Inter', weights: [600] },
          body: { family: 'Inter', weights: [400] },
        },
      }),
      'utf8',
    );
  });

  afterAll(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(fixturesDir, { recursive: true, force: true });
  });

  it('throws on invalid schema', async () => {
    await expect(loadBrand('broken', { brandsDir: fixturesDir })).rejects.toThrow(
      /Invalid brand schema/,
    );
  });

  it('listBrands skips invalid brand folders', async () => {
    const brands = await listBrands({ brandsDir: fixturesDir });
    const names = brands.map((b) => b.name);
    expect(names).toEqual(['default']);
  });
});
