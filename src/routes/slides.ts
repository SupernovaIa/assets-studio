import { Router } from 'express';
import { z } from 'zod';

import { loadBrand } from '@/lib/brand.js';
import { editContentSlide } from '@/lib/slides/edit.js';
import { generateSlides } from '@/lib/slides/generate.js';
import { renderDeck } from '@/lib/slides/render.js';
import { buildShowcaseSlides } from '@/lib/slides/showcase.js';
import type { ContentSlide, Slide } from '@/lib/slides/types.js';

const CoverSlideSchema = z.object({
  type: z.literal('cover'),
  module: z.string().optional(),
  title: z.string(),
  subtitle: z.string().optional(),
});

const SectionSlideSchema = z.object({
  type: z.literal('section'),
  number: z.number(),
  label: z.string().optional(),
  title: z.string(),
});

const ContentSlideSchema = z.object({
  type: z.literal('content'),
  id: z.string(),
  moduleLabel: z.string().optional(),
  title: z.string(),
  layout: z.string(),
  items: z.number(),
  html: z.string(),
  css: z.string(),
});

const ThanksSlideSchema = z.object({
  type: z.literal('thanks'),
  text: z.string(),
  tagline: z.string().optional(),
});

const SlideSchema = z.discriminatedUnion('type', [
  CoverSlideSchema,
  SectionSlideSchema,
  ContentSlideSchema,
  ThanksSlideSchema,
]);

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const GenerateBodySchema = z.object({
  markdown: z.string().min(1),
  brand: z.string().optional(),
});

const EditBodySchema = z.object({
  slides: z.array(SlideSchema).min(1),
  chats: z.array(z.array(ChatMessageSchema)),
  slideIndex: z.number().int().nonnegative(),
  message: z.string().min(1),
  brand: z.string().optional(),
});

const RenderBodySchema = z.object({
  slides: z.array(SlideSchema).min(1),
  brand: z.string().optional(),
  filename: z.string().optional(),
});

export function slidesRouter(): Router {
  const router = Router();

  // POST /api/slides/generate
  router.post('/generate', async (req, res, next) => {
    try {
      const body = GenerateBodySchema.parse(req.body);
      const brand = await loadBrand(body.brand ?? 'default');
      const slides = await generateSlides(body.markdown, brand);
      res.json({ slides });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/slides/edit
  router.post('/edit', async (req, res, next) => {
    try {
      const body = EditBodySchema.parse(req.body);
      const slides = body.slides as Slide[];

      if (body.slideIndex >= slides.length) {
        res.status(400).json({ error: `slideIndex ${body.slideIndex} out of range` });
        return;
      }
      const target = slides[body.slideIndex];
      if (target.type !== 'content') {
        res.status(400).json({
          error: `slide at index ${body.slideIndex} is type "${target.type}"; only content slides can be edited`,
        });
        return;
      }

      // Pad chats to slides.length so we can address by index safely.
      const chats: { role: 'user' | 'assistant'; content: string }[][] = slides.map(
        (_, i) => body.chats[i] ?? [],
      );
      const history = chats[body.slideIndex];

      const brand = await loadBrand(body.brand ?? 'default');
      const result = await editContentSlide(
        target as ContentSlide,
        history,
        body.message,
        brand,
      );

      slides[body.slideIndex] = result.slide;
      chats[body.slideIndex] = [
        ...history,
        { role: 'user', content: body.message },
        { role: 'assistant', content: result.summary },
      ];

      res.json({ slides, chats });
    } catch (err) {
      next(err);
    }
  });

  // POST /api/slides/preview
  router.post('/preview', async (req, res, next) => {
    try {
      const body = RenderBodySchema.parse(req.body);
      const brand = await loadBrand(body.brand ?? 'default');
      const html = renderDeck(body.slides as Slide[], brand);
      res.type('html').send(html);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/slides/showcase — static deck exercising every component.
  router.get('/showcase', async (req, res, next) => {
    try {
      const brandName = typeof req.query.brand === 'string' ? req.query.brand : 'default';
      const brand = await loadBrand(brandName);
      const html = renderDeck(buildShowcaseSlides(), brand, {
        title: `${brand.displayName} — Component library`,
      });
      res.type('html').send(html);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/slides/download
  router.post('/download', async (req, res, next) => {
    try {
      const body = RenderBodySchema.parse(req.body);
      const brand = await loadBrand(body.brand ?? 'default');
      const html = renderDeck(body.slides as Slide[], brand);
      const filename = (body.filename ?? `${brand.name}-deck`).replace(/[^\w.-]+/g, '-');
      res
        .type('html')
        .setHeader('Content-Disposition', `attachment; filename="${filename}.html"`)
        .send(html);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
