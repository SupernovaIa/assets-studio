import Anthropic from '@anthropic-ai/sdk';

import type { Brand } from '@/lib/brand.js';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

/**
 * Minimal system prompt. We trust the model to write a good prompt
 * conversationally, the way ChatGPT does, given an exemplar and the
 * target document. No long rule lists, no anti-patterns — verbose
 * system prompts make Sonnet hedge.
 */
export function buildBriefSystem(): string {
  return 'You are a senior visual designer. You write prompts for gpt-image-2 to render editorial infographic posters. Be specific and decisive about layout, icons, illustrations, and typography. Match the register and structure of any example you are given.';
}

function buildBriefUser(markdown: string, brand: Brand): string {
  const exemplar = brand.briefExemplar;
  if (!exemplar) {
    throw new Error(
      `Brand "${brand.name}" has no brief exemplar. Add brands/${brand.name}/brief-exemplar.txt.`,
    );
  }

  const lines = [
    "Here is a prompt that worked very well for me:",
    '',
    '---',
    exemplar,
    '---',
    '',
    'Now write me an equivalent prompt for the document below, with the same register, structure and level of specificity, adapted to its content.',
    '',
    'Use this brand instead of whatever is in the example:',
    `- primary colour: ${brand.palette.primary}`,
    `- accent colour: ${brand.palette.accent} (use sparingly, only for highlights and key accents)`,
    `- secondary: ${brand.palette.secondary}`,
    `- background surface: ${brand.palette.surface}`,
    `- heading font: '${brand.fonts.heading.family}'`,
    `- body font: '${brand.fonts.body.family}'`,
  ];

  if (brand.logo) {
    const corner = brand.logo.position.replace('-', ' ');
    lines.push(`- reserve a small empty area in the ${corner} corner for a brand logo (composited later)`);
  } else {
    lines.push('- no logo');
  }

  lines.push(
    '',
    'Document:',
    '',
    markdown,
    '',
    'Return only the prompt text. No preamble, no markdown fences, no explanations.',
  );

  return lines.join('\n');
}

export interface BuildBriefOptions {
  apiKey?: string;
  model?: string;
}

export interface BriefResult {
  system: string;
  user: string;
  output: string;
}

export async function buildVisualBrief(
  markdown: string,
  brand: Brand,
  opts: BuildBriefOptions = {},
): Promise<BriefResult> {
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });
  const system = buildBriefSystem();
  const user = buildBriefUser(markdown, brand);

  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: 1500,
    system,
    messages: [{ role: 'user', content: user }],
  });

  for (const block of response.content) {
    if (block.type === 'text') {
      return { system, user, output: block.text.trim() };
    }
  }
  throw new Error('No text content in Anthropic brief response');
}
