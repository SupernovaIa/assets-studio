import OpenAI from 'openai';

const DEFAULT_MODEL = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2';
const DEFAULT_SIZE = process.env.OPENAI_IMAGE_SIZE ?? '2048x1024';

export interface GenerateImageOptions {
  apiKey?: string;
  model?: string;
  /** Free-form size string passed through to OpenAI (e.g. "1792x1024", "2048x1152"). */
  size?: string;
}

export async function generateInfographicImage(
  prompt: string,
  opts: GenerateImageOptions = {},
): Promise<Buffer> {
  const client = new OpenAI({ apiKey: opts.apiKey ?? process.env.OPENAI_API_KEY });

  // Cast to `never` because the v4 SDK's union type pre-dates gpt-image-2 sizes.
  // OpenAI accepts more sizes at runtime than the type allows.
  const response = await client.images.generate({
    model: opts.model ?? DEFAULT_MODEL,
    prompt,
    size: (opts.size ?? DEFAULT_SIZE) as never,
    quality: 'high' as never,
    n: 1,
  });

  const item = response.data?.[0];
  if (!item) {
    throw new Error('Image generation returned no data');
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item.url) {
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch generated image: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error('Image generation returned neither b64_json nor url');
}
