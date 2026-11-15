const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/mrchi/.gemini/antigravity/brain/e49c83be-4283-4849-99ce-97e6e26106da/.user_uploaded/media_1794738952167_6aa6bc78.jpg';
const publicDir = path.resolve(__dirname, '../public');
const appDir = path.resolve(__dirname, '../app');
const bg = { r: 236, g: 238, b: 251, alpha: 1 };

async function buildAllIcons() {
  console.log('Generating complete PWA & WebAPK icon suite from:', src);

  // 1. logo.jpg master
  fs.copyFileSync(src, path.join(publicDir, 'logo.jpg'));
  console.log('✓ public/logo.jpg copied');

  // 2. Standard icons (any purpose)
  const standard = [
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-512-v2.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-192-v2.png', size: 192 },
    { name: 'logo.png', size: 512 },
    { name: 'logo-v2.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-v2.png', size: 180 },
    { name: 'favicon.png', size: 64 },
    { name: 'favicon-v2.png', size: 64 },
  ];

  for (const item of standard) {
    await sharp(src)
      .resize(item.size, item.size, { fit: 'contain', background: bg })
      .png({ quality: 95 })
      .toFile(path.join(publicDir, item.name));
    console.log('✓ public/' + item.name);
  }

  // 3. Maskable icons for Android Home Screen (with 80% safe zone padding)
  // Safe zone: inner 80% (410px in 512px, 154px in 192px)
  const inner512 = await sharp(src).resize(410, 410, { fit: 'contain', background: bg }).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: bg
    }
  })
  .composite([{ input: inner512, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(publicDir, 'maskable-icon-512.png'));
  fs.copyFileSync(path.join(publicDir, 'maskable-icon-512.png'), path.join(publicDir, 'maskable-icon-512-v2.png'));
  console.log('✓ public/maskable-icon-512.png & v2');

  const inner192 = await sharp(src).resize(154, 154, { fit: 'contain', background: bg }).toBuffer();
  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: bg
    }
  })
  .composite([{ input: inner192, gravity: 'center' }])
  .png({ quality: 95 })
  .toFile(path.join(publicDir, 'maskable-icon-192.png'));
  fs.copyFileSync(path.join(publicDir, 'maskable-icon-192.png'), path.join(publicDir, 'maskable-icon-192-v2.png'));
  console.log('✓ public/maskable-icon-192.png & v2');

  // 4. Favicon.ico
  await sharp(src).resize(32, 32, { fit: 'contain', background: bg }).toFormat('png').toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ public/favicon.ico');

  // 5. Next.js app icons
  await sharp(src).resize(512, 512, { fit: 'contain', background: bg }).png({ quality: 95 }).toFile(path.join(appDir, 'icon.png'));
  await sharp(src).resize(180, 180, { fit: 'contain', background: bg }).png({ quality: 95 }).toFile(path.join(appDir, 'apple-icon.png'));
  console.log('✓ app/icon.png & app/apple-icon.png');

  console.log('\nAll PWA, WebAPK, and App icons generated successfully!');
}

buildAllIcons().catch(console.error);
