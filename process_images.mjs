import sharp from 'sharp';
import fs from 'fs';

const input = '/Users/nanyarruda/Downloads/Untitled design (37).png';
const outDir = './public';

async function main() {
  // copy original
  fs.copyFileSync(input, `${outDir}/logo-nany.png`);

  // icon-192.png
  await sharp({
    create: { width: 192, height: 192, channels: 4, background: '#6B5CE7' }
  })
  .composite([
    { input: await sharp(input).resize(120, 120, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} }).toBuffer(), gravity: 'center' }
  ])
  .png()
  .toFile(`${outDir}/icon-192.png`);

  // icon-512.png
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: '#6B5CE7' }
  })
  .composite([
    { input: await sharp(input).resize(320, 320, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} }).toBuffer(), gravity: 'center' }
  ])
  .png()
  .toFile(`${outDir}/icon-512.png`);

  // apple-touch-icon.png
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: '#6B5CE7' }
  })
  .composite([
    { input: await sharp(input).resize(110, 110, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} }).toBuffer(), gravity: 'center' }
  ])
  .png()
  .toFile(`${outDir}/apple-touch-icon.png`);

  // favicon.ico (simplified version - just 32x32 of the logo)
  await sharp(input)
    .resize(32, 32, { fit: 'contain', background: {r:0,g:0,b:0,alpha:0} })
    .png()
    .toFile(`${outDir}/favicon.ico`);
    
  console.log('Images generated successfully');
}

main().catch(console.error);
