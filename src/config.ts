const parsedPort = Number(process.env.PORT ?? 3000);

if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

export const env = {
  PORT: parsedPort,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};
