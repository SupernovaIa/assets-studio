import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/create-app.js';

describe('smoke', () => {
  it('GET / returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, service: 'slides-studio' });
  });
});
