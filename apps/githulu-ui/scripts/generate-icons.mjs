import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const SVG_SOURCE = join(PUBLIC_DIR, 'githulu_dark.svg');

const sizes = [
  { width: 64, height: 64, output: 'icon_dark_64x64.png' },
  { width: 128, height: 128, output: 'icon_dark_128x128.png' },
];

const svg = await readFile(SVG_SOURCE);

for (const { width, height, output } of sizes) {
  const radius = Math.round(width * 0.2);
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`
  );

  const dest = join(PUBLIC_DIR, output);
  await sharp(svg)
    .resize(width, height)
    .png()
    .composite([{ input: mask, blend: 'dest-in' }])
    .toFile(dest);
  console.log(`Generated ${output} (${width}x${height}, radius=${radius})`);
}
