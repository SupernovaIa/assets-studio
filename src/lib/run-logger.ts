import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface RunLogger {
  dir: string;
  write(name: string, content: string | Buffer): Promise<void>;
  writeJson(name: string, data: unknown): Promise<void>;
}

/**
 * Creates a per-run log directory under `logs/<slug>/` and returns a
 * minimal logger with `write` / `writeJson` helpers. Each generation
 * (slides or infographic) drops its prompts, responses and final
 * artifacts there so a run is fully reproducible from disk.
 */
export async function createRunLogger(slug: string): Promise<RunLogger> {
  const dir = path.resolve('logs', slug);
  await mkdir(dir, { recursive: true });
  return {
    dir,
    async write(name, content) {
      await writeFile(path.join(dir, name), content);
    },
    async writeJson(name, data) {
      await writeFile(path.join(dir, name), JSON.stringify(data, null, 2), 'utf8');
    },
  };
}
