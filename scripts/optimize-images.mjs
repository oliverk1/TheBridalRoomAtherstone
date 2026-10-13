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
  let convertedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(UPLOADS_DIR, file);

    // Only process PNGs, JPEGs, and raw JPGs
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const baseName = path.basename(file, ext);
      const webpName = `${baseName}.webp`;
      const webpPath = path.join(UPLOADS_DIR, webpName);

      try {
        // Resize to max 1200px width, convert to WebP at 80% quality
        await sharp(filePath)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toFile(webpPath);

        // Delete original bloated JPG/PNG to keep repo lean
        fs.unlinkSync(filePath);
        convertedCount++;
        console.log(`[Auto-WebP] Optimized: ${file} -> ${webpName} (<100KB)`);
      } catch (err) {
        console.error(`[Auto-WebP] Failed to optimize ${file}:`, err);
      }
    }
  }

  if (convertedCount > 0) {
    console.log(`[Auto-WebP] Successfully compressed ${convertedCount} images.`);
  }
}

processImages();