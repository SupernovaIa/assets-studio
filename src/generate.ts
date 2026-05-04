import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { loadBrand } from '@/lib/brand.js';
import { generateSlides } from '@/lib/slides/generate.js';
import { renderDeck } from '@/lib/slides/render.js';

interface CliArgs {
  input: string;
  brand: string;
  out?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let brand = 'default';
  let out: string | undefined;

  for (const arg of argv) {
    if (arg.startsWith('--brand=')) {
      brand = arg.slice('--brand='.length);
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (positional.length !== 1) {
    throw new Error('Usage: tsx src/generate.ts <input.md> [--brand=NAME] [--out=PATH]');
  }

  return { input: positional[0], brand, out };
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set (check your .env)');
  }

  const markdown = await readFile(args.input, 'utf8');
  const brand = await loadBrand(args.brand);

  console.warn(`[generate] brand=${brand.name} input=${args.input} model=${process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'}`);
  console.warn('[generate] phase 1: outline + content (parallel)…');
  const t0 = Date.now();
  const slides = await generateSlides(markdown, brand);
  console.warn(`[generate] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${slides.length} slides`);

  const html = renderDeck(slides, brand, { title: `${brand.displayName} — ${path.basename(args.input)}` });

  const outPath =
    args.out ??
    path.resolve('output', `${timestamp()}-${brand.name}-${path.basename(args.input, path.extname(args.input))}.html`);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');

  // Also dump raw slides JSON next to the HTML for debugging.
  const jsonPath = outPath.replace(/\.html$/, '.json');
  await writeFile(jsonPath, JSON.stringify(slides, null, 2), 'utf8');

  console.warn(`[generate] wrote ${outPath}`);
  console.warn(`[generate] wrote ${jsonPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
