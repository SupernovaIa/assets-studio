import { Router } from 'express';
import { z } from 'zod';

import type { Brand } from '@/lib/brand.js';
import { loadBrand } from '@/lib/brand.js';
import { buildVisualBrief } from '@/lib/infographic/brief.js';
import { compositeLogo } from '@/lib/infographic/composite.js';
import { generateInfographicImage } from '@/lib/infographic/image.js';
import { createRunLogger } from '@/lib/run-logger.js';

const BodySchema = z.object({
  markdown: z.string().min(1),
  brand: z.string().optional(),
});

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInfographicHtml(imageUrl: string, brand: Brand): string {
  const title = `${brand.displayName} — Infografía`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #e2e8f0; overflow: hidden; }
  .wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .frame { max-width: 100%; max-height: 100%; display: block; box-shadow: 0 4px 40px rgba(0,0,0,0.4); border-radius: 8px; background: ${escapeHtml(brand.palette.surface)}; }
  .actions { position: fixed; bottom: 16px; right: 16px; display: flex; gap: 8px; z-index: 10; }
  .btn { background: rgba(15,23,42,0.85); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); padding: 8px 14px; font-size: 12px; border-radius: 8px; cursor: pointer; text-decoration: none; font-family: inherit; }
  .btn:hover { color: #fff; }
  @media print {
    html, body { background: #fff !important; overflow: visible !important; }
    .wrap { position: static !important; padding: 0 !important; display: block !important; }
    .frame { box-shadow: none !important; border-radius: 0 !important; width: 100% !important; max-height: none !important; }
    .actions { display: none !important; }
  }
</style>
</head>
<body>
<div class="wrap"><img class="frame" src="${imageUrl}" alt="Infografía"></div>
<div class="actions">
  <a class="btn" href="${imageUrl}" download="infografia.png">Descargar PNG</a>
  <button class="btn" onclick="window.print()">Imprimir</button>
</div>
</body>
</html>`;
}

export function infographicRouter(): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const body = BodySchema.parse(req.body);
      const brand = await loadBrand(body.brand ?? 'default');
      const slug = `${timestamp()}-infographic-${brand.name}-api`;
      const log = await createRunLogger(slug);

      const t0 = Date.now();
      const brief = await buildVisualBrief(body.markdown, brand);
      const briefSeconds = (Date.now() - t0) / 1000;
      await log.write('brief-system.md', brief.system);
      await log.write('brief-user.md', brief.user);
      await log.write('image-prompt.txt', brief.output);

      const t1 = Date.now();
      const rawImage = await generateInfographicImage(brief.output);
      const imageSeconds = (Date.now() - t1) / 1000;
      await log.write('image-raw.png', rawImage);

      const finalImage = await compositeLogo(rawImage, brand);
      await log.write('image-final.png', finalImage);

      const imageUrl = `data:image/png;base64,${finalImage.toString('base64')}`;
      const html = renderInfographicHtml(imageUrl, brand);

      await log.writeJson('meta.json', {
        service: 'infographic',
        source: 'api',
        brand: brand.name,
        briefModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
        imageModel: process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-2',
        imageSize: process.env.OPENAI_IMAGE_SIZE ?? '2048x1024',
        briefSeconds,
        imageSeconds,
      });

      res.json({ imageUrl, html, brand: { name: brand.name, displayName: brand.displayName } });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
