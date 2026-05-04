import 'dotenv/config';

import { env } from '@/config.js';
import { createApp } from '@/create-app.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.warn(`slides-studio listening on :${env.PORT} [${env.NODE_ENV}]`);
});
