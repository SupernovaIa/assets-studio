import Anthropic from '@anthropic-ai/sdk';

import type { Brand } from '@/lib/brand.js';
import { buildEditPrompt, EDIT_USER_TEMPLATE } from '@/lib/slides/prompts.js';
import type { ContentSlide } from '@/lib/slides/types.js';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface EditOptions {
  apiKey?: string;
  model?: string;
}

export interface EditResult {
  summary: string;
  slide: ContentSlide;
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return fence ? fence[1].trim() : trimmed;
}

export async function editContentSlide(
  slide: ContentSlide,
  chat: ReadonlyArray<ChatMessage>,
  message: string,
  brand: Brand,
  opts: EditOptions = {},
): Promise<EditResult> {
  const client = new Anthropic({ apiKey: opts.apiKey ?? process.env.ANTHROPIC_API_KEY });
  const system = buildEditPrompt(brand);
  const user = EDIT_USER_TEMPLATE(
    {
      id: slide.id,
      title: slide.title,
      layout: slide.layout,
      html: slide.html,
      css: slide.css,
    },
    chat,
    message,
  );

  const response = await client.messages.create({
    model: opts.model ?? DEFAULT_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  });

  let raw = '';
  for (const block of response.content) {
    if (block.type === 'text') {
      raw = block.text;
      break;
    }
  }
  if (!raw) {
    throw new Error('No text content in edit response');
  }

  const json = stripJsonFences(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error(`Edit JSON parse failed: ${(err as Error).message}\n---\n${json}`);
  }
  const obj = parsed as { summary?: unknown; html?: unknown; css?: unknown };
  if (
    typeof obj.summary !== 'string' ||
    typeof obj.html !== 'string' ||
    typeof obj.css !== 'string'
  ) {
    throw new Error('Edit response missing summary/html/css strings');
  }

  return {
    summary: obj.summary,
    slide: { ...slide, html: obj.html, css: obj.css },
  };
}
