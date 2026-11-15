const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/mrchi/.gemini/antigravity/brain/e49c83be-4283-4849-99ce-97e6e26106da/.user_uploaded/media_1794738952167_6aa6bc78.jpg';
const publicDir = path.resolve(__dirname, '../public');
const appDir = path.resolve(__dirname, '../app');
const bg = { r: 236, g: 238, b: 251, alpha: 1 };

function createIcoBuffer(pngBuffers) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + (16 * pngBuffers.length);
  const dirEntries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(b => b.buffer)
  ]);
}

async function buildAllIcons() {
  console.log('Generating complete suite for Google Search, PWA & WebAPK from:', src);

  // 1. logo.jpg master
  fs.copyFileSync(src, path.join(publicDir, 'logo.jpg'));
  console.log('✓ public/logo.jpg copied');

  // 2. Google Search 48px Multiples & Standard Favicons
  // Google requires 48px multiples: 48, 96, 144, 192
  const googleIcons = [
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-144x144.png', size: 144 },
    { name: 'favicon-192x192.png', size: 192 },
    { name: 'favicon.png', size: 96 },
    { name: 'favicon-v2.png', size: 96 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-192-v2.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-512-v2.png', size: 512 },
    { name: 'logo.png', size: 512 },
    { name: 'logo-v2.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-v2.png', size: 180 },
  ];

  for (const item of googleIcons) {
    await sharp(src)
      .resize(item.size, item.size, { fit: 'contain', background: bg })
      .png({ quality: 95 })
      .toFile(path.join(publicDir, item.name));
    console.log('✓ public/' + item.name);
  }

  // 3. Multi-resolution ICO (16, 32, 48) for public and app
  const icoSizes = [16, 32, 48];
  const icoPngBuffers = [];
  for (const s of icoSizes) {
    const buf = await sharp(src).resize(s, s, { fit: 'contain', background: bg }).png().toBuffer();
    icoPngBuffers.push({ width: s, height: s, buffer: buf });
  }
  const icoBuf = createIcoBuffer(icoPngBuffers);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuf);
  console.log('✓ public/favicon.ico and app/favicon.ico written');

  // 4. Maskable icons with 80% safe zone padding
  const inner512 = await sharp(src).resize(410, 410, { fit: 'contain', background: bg }).toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: bg }
  })
  .composite([{ input: inner512, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(publicDir, 'maskable-icon-512.png'));
  fs.copyFileSync(path.join(publicDir, 'maskable-icon-512.png'), path.join(publicDir, 'maskable-icon-512-v2.png'));
  console.log('✓ public/maskable-icon-512.png & v2');

  const inner192 = await sharp(src).resize(154, 154, { fit: 'contain', background: bg }).toBuffer();
  await sharp({
    create: { width: 192, height: 192, channels: 4, background: bg }
  })
  .composite([{ input: inner192, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(publicDir, 'maskable-icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'maskable-icon-192.png'), path.join(publicDir, 'maskable-icon-192-v2.png'));
  console.log('✓ public/maskable-icon-192.png & v2');

  // 5. Next.js App Router root icons
  await sharp(src).resize(512, 512, { fit: 'contain', background: bg }).png({ quality: 95 }).toFile(path.join(appDir, 'icon.png'));
  await sharp(src).resize(180, 180, { fit: 'contain', background: bg }).png({ quality: 95 }).toFile(path.join(appDir, 'apple-icon.png'));
  console.log('✓ app/icon.png & app/apple-icon.png');

  console.log('\nAll Google Search, PWA, and WebAPK icons successfully regenerated!');
}

buildAllIcons().catch(console.error);
