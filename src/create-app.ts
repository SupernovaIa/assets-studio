import express, { type Express } from 'express';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'slides-studio' });
  });

  return app;
}
