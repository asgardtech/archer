import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import pngToIco from 'png-to-ico';
import * as png2icons from 'png2icons';

const MASTER_PATH = path.resolve(__dirname, '..', 'assets', 'icon-master.png');
const BUILD_DIR = path.resolve(__dirname, '..', 'build');
const ICONS_DIR = path.join(BUILD_DIR, 'icons');

const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const LINUX_SIZES = [16, 32, 48, 64, 128, 256, 512];

async function validateMaster(): Promise<Buffer> {
  if (!fs.existsSync(MASTER_PATH)) {
    console.error(
      `Master icon not found at ${MASTER_PATH}. Run 'npm run icons:placeholder' first.`
    );
    process.exit(1);
  }

  const buf = fs.readFileSync(MASTER_PATH);
  const meta = await sharp(buf).metadata();

  if (!meta.width || !meta.height) {
    console.error('Could not read master icon dimensions.');
    process.exit(1);
  }

  if (meta.width !== meta.height) {
    console.error(
      `Master icon must be square (got ${meta.width}x${meta.height}).`
    );
    process.exit(1);
  }

  if (meta.width < 1024) {
    console.warn(
      `Warning: master icon is ${meta.width}x${meta.height} — ` +
        'ideally it should be at least 1024x1024. Proceeding anyway.'
    );
  }

  return buf;
}

async function generatePng(source: Buffer): Promise<void> {
  const outPath = path.join(BUILD_DIR, 'icon.png');
  await sharp(source).resize(512, 512).png().toFile(outPath);
  console.log(`  ${outPath}`);
}

async function generateIco(source: Buffer): Promise<void> {
  const pngBuffers: Buffer[] = [];
  for (const size of ICO_SIZES) {
    pngBuffers.push(await sharp(source).resize(size, size).png().toBuffer());
  }

  const ico = await pngToIco(pngBuffers);
  const outPath = path.join(BUILD_DIR, 'icon.ico');
  fs.writeFileSync(outPath, ico);

  const header = Buffer.from(ico.buffer, ico.byteOffset, 4);
  if (header[0] !== 0 || header[1] !== 0 || header[2] !== 1 || header[3] !== 0) {
    console.warn('Warning: ICO header magic bytes look incorrect.');
  }

  console.log(`  ${outPath} (sizes: ${ICO_SIZES.join(', ')})`);
}

async function generateIcns(source: Buffer): Promise<void> {
  const icns = png2icons.createICNS(source, png2icons.BILINEAR, 0);
  if (!icns || icns.length === 0) {
    console.error('Failed to generate ICNS file.');
    process.exit(1);
  }

  const outPath = path.join(BUILD_DIR, 'icon.icns');
  fs.writeFileSync(outPath, icns);
  console.log(`  ${outPath}`);
}

async function generateLinuxIcons(source: Buffer): Promise<void> {
  for (const size of LINUX_SIZES) {
    const outPath = path.join(ICONS_DIR, `${size}x${size}.png`);
    await sharp(source).resize(size, size).png().toFile(outPath);
    console.log(`  ${outPath}`);
  }
}

async function main(): Promise<void> {
  console.log('Validating master icon...');
  const source = await validateMaster();

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(ICONS_DIR, { recursive: true });

  console.log('Generating icons:');

  await generatePng(source);
  await generateIco(source);
  await generateIcns(source);
  await generateLinuxIcons(source);

  console.log('All icons generated successfully.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
