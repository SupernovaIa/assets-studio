import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';

import { brandsRouter } from '@/routes/brands.js';
import { infographicRouter } from '@/routes/infographic.js';
import { slidesRouter } from '@/routes/slides.js';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'slides-studio' });
  });

  app.use('/api/brands', brandsRouter());
  app.use('/api/slides', slidesRouter());
  app.use('/api/infographic', infographicRouter());

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid request body', issues: err.issues });
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[error]', err);
    res.status(500).json({ error: message });
  });

  return app;
}
