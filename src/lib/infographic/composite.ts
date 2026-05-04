import sharp from 'sharp';

import type { Brand, LogoPosition } from '@/lib/brand.js';

const PADDING = 48;
const MAX_LOGO_WIDTH_RATIO = 0.14; // logo width relative to base image

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid logo dataUrl');
  }
  return Buffer.from(match[1], 'base64');
}

function gravityFor(position: LogoPosition): {
  top?: number;
  left?: number;
  bottom?: number;
  right?: number;
} {
  switch (position) {
    case 'top-left':
      return { top: PADDING, left: PADDING };
    case 'top-right':
      return { top: PADDING, right: PADDING };
    case 'bottom-left':
      return { bottom: PADDING, left: PADDING };
    case 'bottom-right':
      return { bottom: PADDING, right: PADDING };
  }
}

/**
 * Composites the brand logo onto the generated infographic.
 * If the brand has no logo, returns the input buffer unchanged.
 */
export async function compositeLogo(imageBuffer: Buffer, brand: Brand): Promise<Buffer> {
  if (!brand.logo) {
    return imageBuffer;
  }

  const base = sharp(imageBuffer);
  const { width: baseWidth, height: baseHeight } = await base.metadata();
  if (!baseWidth || !baseHeight) {
    throw new Error('Could not read base image dimensions');
  }

  const logoBuffer = dataUrlToBuffer(brand.logo.dataUrl);
  const targetLogoWidth = Math.round(baseWidth * MAX_LOGO_WIDTH_RATIO);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: targetLogoWidth, withoutEnlargement: true })
    .png()
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width ?? targetLogoWidth;
  const logoH = logoMeta.height ?? Math.round(targetLogoWidth * 0.4);

  const offsets = gravityFor(brand.logo.position);
  const left =
    offsets.left !== undefined
      ? offsets.left
      : baseWidth - logoW - (offsets.right ?? PADDING);
  const top =
    offsets.top !== undefined
      ? offsets.top
      : baseHeight - logoH - (offsets.bottom ?? PADDING);

  return await base
    .composite([{ input: resizedLogo, left, top }])
    .png()
    .toBuffer();
}
