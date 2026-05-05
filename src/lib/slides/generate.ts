import Anthropic from '@anthropic-ai/sdk';

import type { Brand } from '@/lib/brand.js';
import { buildSlidesPrompt } from '@/lib/slides/prompts.js';
import type { Slide } from '@/lib/slides/types.js';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

function stripJsonFences(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*\n?/, '');
  s = s.replace(/\n?```\s*$/, '');
  if (s.startsWith('`') && s.endsWith('`')) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

export interface GenerateOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Single LLM call returns the entire deck as a JSON array. Coherence between
 * slides emerges naturally because the model sees what it just wrote — no
 * parallel divergence in typography or class vocabulary.
 */
export async function generateSlides(
  markdown: string,
  brand: Brand,
  opts: GenerateOptions = {},
): Promise<Slide[]> {
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: 16000,
    system: buildSlidesPrompt(brand),
    messages: [{ role: 'user', content: markdown }],
  });

  let raw = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      raw = block.text;
      break;
    }
  }
  if (!raw) {
    throw new Error('No text content in slides response');
  }

  const json = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Slides JSON parse failed: ${(err as Error).message}\n---\n${json}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Slides response must be a JSON array');
  }
  return parsed as Slide[];
}
