const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = path.join(__dirname, '../public/logo.jpg');
const publicDir = path.join(__dirname, '../public');

async function generate() {
  console.log('Generating icons from:', src);
  
  // logo.png - full size (512x512)
  await sharp(src).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'logo.png'));
  console.log('✓ logo.png');

  // icon-512.png
  await sharp(src).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // icon-192.png
  await sharp(src).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // apple-touch-icon.png (180x180)
  await sharp(src).resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  // favicon.png (32x32)
  await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ favicon.png');

  // favicon.ico (32x32 ICO)
  await sharp(src).resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('✓ favicon.ico');

  console.log('\nAll icons generated successfully!');
}

generate().catch(console.error);

