// scripts/optimize-images.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const UPLOADS_DIR = path.resolve('public/images/uploads');

async function processImages() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  let count = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const filePath = path.join(UPLOADS_DIR, file);
    const stats = fs.statSync(filePath);

    // Only compress files larger than 120KB to avoid unnecessary reprocessing
    if (stats.size > 120 * 1024) {
      try {
        const buffer = fs.readFileSync(filePath);

        // In-place compression: keep same filename, resize to 1200px max, compress to 80%
        let pipeline = sharp(buffer).resize({ width: 1200, withoutEnlargement: true });

        if (ext === '.png') {
          pipeline = pipeline.png({ quality: 80, compressionLevel: 8 });
        } else {
          pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
        }

        const optimizedBuffer = await pipeline.toBuffer();
        fs.writeFileSync(filePath, optimizedBuffer);

        const savedKB = Math.round((stats.size - optimizedBuffer.length) / 1024);
        console.log(`[Image Optimizer] Squeezed ${file}: ${Math.round(stats.size/1024)}KB -> ${Math.round(optimizedBuffer.length/1024)}KB (Saved ${savedKB}KB)`);
        count++;
      } catch (err) {
        console.error(`[Image Optimizer] Skipped ${file}:`, err);
      }
    }
  }

  if (count > 0) {
    console.log(`[Image Optimizer] Successfully optimized ${count} large images.`);
  }
}

processImages();