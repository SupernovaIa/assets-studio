import { Router } from 'express';

import { listBrands } from '@/lib/brand.js';

export function brandsRouter(): Router {
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const brands = await listBrands();
      res.json(brands);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
