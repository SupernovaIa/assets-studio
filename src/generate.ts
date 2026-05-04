import 'dotenv/config';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Brand } from '@/lib/brand.js';
import { loadBrand } from '@/lib/brand.js';
import { buildVisualBrief } from '@/lib/infographic/brief.js';
import { compositeLogo } from '@/lib/infographic/composite.js';
import { generateInfographicImage } from '@/lib/infographic/image.js';
import { createRunLogger } from '@/lib/run-logger.js';
import { generateSlides } from '@/lib/slides/generate.js';
import { renderDeck } from '@/lib/slides/render.js';

type Service = 'slides' | 'infographic';

interface CliArgs {
  input: string;
  brand: string;
  service: Service;
  out?: string;
  promptFile?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const positional: string[] = [];
  let brand = 'default';
  let service: Service = 'slides';
  let out: string | undefined;
  let promptFile: string | undefined;

  for (const arg of argv) {
    if (arg.startsWith('--brand=')) {
      brand = arg.slice('--brand='.length);
    } else if (arg.startsWith('--service=')) {
      const v = arg.slice('--service='.length);
      if (v !== 'slides' && v !== 'infographic') {
        throw new Error(`Unknown service: ${v} (expected slides|infographic)`);
      }
      service = v;
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else if (arg.startsWith('--prompt-file=')) {
      promptFile = arg.slice('--prompt-file='.length);
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    } else {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  if (positional.length !== 1) {
    throw new Error(
      'Usage: tsx src/generate.ts <input.md> [--service=slides|infographic] [--brand=NAME] [--out=PATH] [--prompt-file=PATH]',
    );
  }

  return { input: positional[0], brand, service, out, promptFile };
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function runSlug(args: CliArgs, brand: Brand): string {
  const base = path.basename(args.input, path.extname(args.input));
  return `${timestamp()}-${args.service}-${brand.name}-${base}`;
}

function defaultOutPath(slug: string, ext: string): string {
  return path.resolve('output', `${slug}.${ext}`);
}

function preview(text: string, max = 300): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

async function runSlides(args: CliArgs, brand: Brand, markdown: string, slug: string): Promise<void> {
  const log = await createRunLogger(slug);

  console.warn('[generate] phase 1: outline + content (parallel)…');
  const t0 = Date.now();
  const slides = await generateSlides(markdown, brand);
  const elapsed = (Date.now() - t0) / 1000;
  console.warn(`[generate] done in ${elapsed.toFixed(1)}s — ${slides.length} slides`);

  const html = renderDeck(slides, brand, {
    title: `${brand.displayName} — ${path.basename(args.input)}`,
  });

  const outPath = args.out ?? defaultOutPath(slug, 'html');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  await writeFile(outPath.replace(/\.html$/, '.json'), JSON.stringify(slides, null, 2), 'utf8');

  await log.writeJson('meta.json', {
    service: 'slides',
    brand: brand.name,
    input: args.input,
    model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    slideCount: slides.length,
    elapsedSeconds: elapsed,
    outPath,
  });
  await log.writeJson('slides.json', slides);
  await log.write('deck.html', html);

  console.warn(`[generate] wrote ${outPath}`);
  console.warn(`[generate] log dir: ${log.dir}`);
}

async function runInfographic(args: CliArgs, brand: Brand, markdown: string, slug: string): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set (check your .env)');
  }

  const log = await createRunLogger(slug);

  let imagePrompt: string;
  let briefSeconds: number | undefined;

  if (args.promptFile) {
    console.warn(`[generate] using raw prompt from ${args.promptFile} (skipping Anthropic)`);
    imagePrompt = await readFile(args.promptFile, 'utf8');
    await log.write('image-prompt.txt', imagePrompt);
    await log.writeJson('prompt-source.json', { promptFile: args.promptFile });
  } else {
    console.warn('[generate] step 1: visual brief…');
    const t1 = Date.now();
    const brief = await buildVisualBrief(markdown, brand);
    briefSeconds = (Date.now() - t1) / 1000;
    console.warn(`[generate] brief ready (${briefSeconds.toFixed(1)}s, ${brief.output.length} chars)`);
    console.warn(`[generate] image prompt preview: ${preview(brief.output)}`);
    await log.write('brief-system.md', brief.system);
    await log.write('brief-user.md', brief.user);
    await log.write('image-prompt.txt', brief.output);
    imagePrompt = brief.output;
  }

  console.warn('[generate] gpt-image-2 generation (this takes a while)…');
  const t2 = Date.now();
  const rawImage = await generateInfographicImage(imagePrompt);
  const imageSeconds = (Date.now() - t2) / 1000;
  console.warn(`[generate] image ready in ${imageSeconds.toFixed(1)}s`);
  await log.write('image-raw.png', rawImage);

  console.warn('[generate] logo composite…');
  const finalImage = await compositeLogo(rawImage, brand);
  await log.write('image-final.png', finalImage);

  const outPath = args.out ?? defaultOutPath(slug, 'png');
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, finalImage);

  await log.writeJson('meta.json', {
    service: 'infographic',
    brand: brand.name,
    input: args.input,
    promptFile: args.promptFile ?? null,
    briefModel: args.promptFile ? null : (process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'),
    imageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2',
    imageSize: process.env.OPENAI_IMAGE_SIZE ?? '1792x1024',
    briefSeconds: briefSeconds ?? null,
    imageSeconds,
    outPath,
  });

  console.warn(`[generate] wrote ${outPath}`);
  console.warn(`[generate] log dir: ${log.dir}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set (check your .env)');
  }

  const markdown = await readFile(args.input, 'utf8');
  const brand = await loadBrand(args.brand);
  const slug = runSlug(args, brand);

  console.warn(`[generate] service=${args.service} brand=${brand.name} input=${args.input}`);

  if (args.service === 'slides') {
    await runSlides(args, brand, markdown, slug);
  } else {
    await runInfographic(args, brand, markdown, slug);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
