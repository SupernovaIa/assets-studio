import Anthropic from '@anthropic-ai/sdk';

import type { Brand } from '@/lib/brand.js';
import {
  buildContentPrompt,
  CONTENT_USER_TEMPLATE,
  OUTLINE_PROMPT,
} from '@/lib/slides/prompts.js';
import type { ContentSlideOutline, OutlineSlide, Slide } from '@/lib/slides/types.js';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function extractText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === 'text') {
      return block.text;
    }
  }
  throw new Error('No text content in Anthropic response');
}

async function callLLM(
  client: Anthropic,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string> {
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return extractText(response);
}

async function generateOutline(
  client: Anthropic,
  markdown: string,
): Promise<OutlineSlide[]> {
  const raw = await callLLM(client, OUTLINE_PROMPT, markdown, 4096);
  const json = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Outline JSON parse failed: ${(err as Error).message}\n---\n${json}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Outline must be a JSON array');
  }
  return parsed as OutlineSlide[];
}

async function generateContentSlide(
  client: Anthropic,
  brand: Brand,
  outline: ContentSlideOutline,
  sourceMarkdown: string,
): Promise<{ html: string; css: string }> {
  const system = buildContentPrompt(brand);
  const user = CONTENT_USER_TEMPLATE(outline, sourceMarkdown);
  const raw = await callLLM(client, system, user, 4096);
  const json = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(
      `Content JSON parse failed for ${outline.id}: ${(err as Error).message}\n---\n${json}`,
    );
  }
  const obj = parsed as { html?: unknown; css?: unknown };
  if (typeof obj.html !== 'string' || typeof obj.css !== 'string') {
    throw new Error(`Content slide ${outline.id} missing html/css strings`);
  }
  return { html: obj.html, css: obj.css };
}

export interface GenerateOptions {
  apiKey?: string;
  model?: string;
}

export async function generateSlides(
  markdown: string,
  brand: Brand,
  opts: GenerateOptions = {},
): Promise<Slide[]> {
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });

  const outline = await generateOutline(client, markdown);

  const tasks = outline.map(async (entry): Promise<Slide> => {
    if (entry.type !== 'content') {
      return entry;
    }
    const { html, css } = await generateContentSlide(client, brand, entry, markdown);
    return { ...entry, html, css };
  });

  return await Promise.all(tasks);
}
