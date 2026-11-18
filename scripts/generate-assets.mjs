import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BLUEPRINT_DIR = 'C:/project/varena/direct-selling-platform-blueprint';
const PUBLIC_BRAND_DIR = 'C:/project/varena/public/brand';
const PUBLIC_ICONS_DIR = 'C:/project/varena/public/icons';
const PUBLIC_DIR = 'C:/project/varena/public';
const APP_DIR = 'C:/project/varena/src/app';

// Ensure directories exist
[PUBLIC_BRAND_DIR, PUBLIC_ICONS_DIR, PUBLIC_DIR, APP_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function createIcoFromPngs(pngBuffers) {
  const numImages = pngBuffers.length;
  const headerLength = 6;
  const entryLength = 16;
  let offset = headerLength + numImages * entryLength;

  const header = Buffer.alloc(headerLength);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const entries = [];
  for (const png of pngBuffers) {
    const entry = Buffer.alloc(entryLength);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image size
    entry.writeUInt32LE(offset, 12); // image offset

    offset += png.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function run() {
  console.log('--- Generating High-Resolution VARENA Brand & Icon Assets ---');

  const circleDarkSrc = path.join(BLUEPRINT_DIR, 'image_185f9191.jpg');
  const circleLightSrc = path.join(BLUEPRINT_DIR, 'image_a3366bed.jpg');
  const squareSrc = path.join(BLUEPRINT_DIR, 'image_e6ca663c.jpg');
  const luxuryHorizontalSrc = path.join(BLUEPRINT_DIR, 'VARENA Gold Luxury Logo.png');
  const luxuryMonogramSrc = path.join(BLUEPRINT_DIR, 'Luxurious VARENA Gold Monogram Logo.png');

  // 1. Circle Dark Emblem (Clean alpha border at r=404 to eliminate white antialiasing halo)
  const circleDarkMask = Buffer.from(
    `<svg width="1024" height="1024"><circle cx="512" cy="512" r="404" fill="#fff" /></svg>`
  );
  const circleDarkRaw = await sharp(circleDarkSrc)
    .composite([{ input: circleDarkMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const circleDarkPng = await sharp(circleDarkRaw)
    .trim()
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_BRAND_DIR, 'logo-circle.png'), circleDarkPng);
  fs.writeFileSync(path.join(PUBLIC_BRAND_DIR, 'logo-circle-dark.png'), circleDarkPng);
  console.log('✓ Created public/brand/logo-circle.png (Dark circle with clean alpha)');

  // 2. Circle Light Emblem
  const circleLightMask = Buffer.from(
    `<svg width="1024" height="1024"><circle cx="512" cy="512" r="404" fill="#fff" /></svg>`
  );
  const circleLightRaw = await sharp(circleLightSrc)
    .composite([{ input: circleLightMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const circleLightPng = await sharp(circleLightRaw)
    .trim()
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_BRAND_DIR, 'logo-circle-light.png'), circleLightPng);
  console.log('✓ Created public/brand/logo-circle-light.png (Light circle with clean alpha)');

  // 3. Square / Squircle Emblem (Clean alpha rounded corners)
  const squircleMask = Buffer.from(
    `<svg width="1024" height="1024"><rect x="89" y="89" width="845" height="828" rx="155" ry="155" fill="#fff" /></svg>`
  );
  const squareRaw = await sharp(squareSrc)
    .composite([{ input: squircleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const squarePng = await sharp(squareRaw)
    .trim()
    .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_BRAND_DIR, 'logo-square.png'), squarePng);
  console.log('✓ Created public/brand/logo-square.png (Squircle with clean alpha)');

  // 4. Square Full Bleed (Deep espresso background #30241D)
  const squareFullBleed = await sharp(squareSrc)
    .extract({ left: 100, top: 100, width: 824, height: 824 })
    .resize(1024, 1024)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_BRAND_DIR, 'logo-square-full.png'), squareFullBleed);
  console.log('✓ Created public/brand/logo-square-full.png (Full bleed square)');

  // 5. Copy brand logos
  if (fs.existsSync(luxuryHorizontalSrc)) {
    fs.copyFileSync(luxuryHorizontalSrc, path.join(PUBLIC_BRAND_DIR, 'logo-horizontal.png'));
    console.log('✓ Copied public/brand/logo-horizontal.png');
  }
  if (fs.existsSync(luxuryMonogramSrc)) {
    fs.copyFileSync(luxuryMonogramSrc, path.join(PUBLIC_BRAND_DIR, 'logo-monogram.png'));
    console.log('✓ Copied public/brand/logo-monogram.png');
  }

  // 6. Generate PWA App Icons (Square / Squircle)
  const icon192 = await sharp(squarePng)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, 'icon-192x192.png'), icon192);

  const icon512 = await sharp(squarePng)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, 'icon-512x512.png'), icon512);

  // Maskable PWA icons (with safe-zone inset on #30241D espresso background)
  const maskable192 = await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 48, g: 36, b: 29, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp(squareFullBleed).resize(150, 150).toBuffer(),
        top: 21,
        left: 21
      }
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, 'icon-maskable-192x192.png'), maskable192);

  const maskable512 = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 48, g: 36, b: 29, alpha: 1 }
    }
  })
    .composite([
      {
        input: await sharp(squareFullBleed).resize(400, 400).toBuffer(),
        top: 56,
        left: 56
      }
    ])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, 'icon-maskable-512x512.png'), maskable512);
  console.log('✓ Generated PWA icons (192, 512, and maskable variants)');

  // 7. Apple Touch Icons (180x180)
  const appleTouchIcon = await sharp(squarePng)
    .resize(180, 180, { fit: 'contain', background: { r: 48, g: 36, b: 29, alpha: 1 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), appleTouchIcon);
  fs.writeFileSync(path.join(PUBLIC_ICONS_DIR, 'apple-touch-icon.png'), appleTouchIcon);
  console.log('✓ Generated Apple Touch Icons');

  // 8. Favicons (16x16, 32x32, 48x48) & ICO
  const fav16 = await sharp(squarePng).resize(16, 16).png().toBuffer();
  const fav32 = await sharp(squarePng).resize(32, 32).png().toBuffer();
  const fav48 = await sharp(squarePng).resize(48, 48).png().toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), fav16);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), fav32);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), fav32);

  const icoBuffer = createIcoFromPngs([fav16, fav32, fav48]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('✓ Generated public/favicon.ico (Multi-size 16/32/48 ICO static file)');

  console.log('=== All assets successfully updated! ===');
}

run().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
