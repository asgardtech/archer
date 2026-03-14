import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const OUTPUT_PATH = path.resolve(__dirname, '..', 'assets', 'icon-master.png');
const SIZE = 1024;

const BRAND_DARK = '#1a1a2e';
const BRAND_MID = '#16213e';
const BRAND_RED = '#e94560';
const BRAND_RED_LIGHT = '#ff6b81';

/**
 * SVG placeholder depicting a stylized raptor with spread wings —
 * bold enough to remain legible at 16×16.
 */
function buildSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${BRAND_DARK}"/>
      <stop offset="100%" stop-color="#0f0f1a"/>
    </linearGradient>
    <linearGradient id="bird" x1="0.5" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="${BRAND_RED_LIGHT}"/>
      <stop offset="100%" stop-color="${BRAND_RED}"/>
    </linearGradient>
  </defs>

  <!-- Rounded background -->
  <rect width="${SIZE}" height="${SIZE}" rx="180" fill="url(#bg)"/>

  <!-- Subtle ring -->
  <circle cx="512" cy="512" r="400" fill="none" stroke="${BRAND_RED}" stroke-width="16" opacity="0.15"/>

  <!-- Inner disc -->
  <circle cx="512" cy="512" r="360" fill="${BRAND_MID}"/>

  <!-- Raptor silhouette — spread wings, upward thrust -->
  <path d="
    M 512 150
    L 580 390
    L 940 310
    L 670 530
    L 610 850
    L 512 680
    L 414 850
    L 354 530
    L 84  310
    L 444 390
    Z
  " fill="url(#bird)"/>

  <!-- Body highlight -->
  <path d="M 512 190 L 548 390 L 512 620 L 476 390 Z" fill="white" opacity="0.12"/>
</svg>`;
}

async function main(): Promise<void> {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const svg = Buffer.from(buildSvg());
  await sharp(svg)
    .resize(SIZE, SIZE)
    .png()
    .toFile(OUTPUT_PATH);

  console.log(`Placeholder icon created at ${OUTPUT_PATH} (${SIZE}x${SIZE})`);
}

main().catch((err) => {
  console.error('Failed to generate placeholder icon:', err);
  process.exit(1);
});
