import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../../public');
const photosDir = path.join(publicDir, 'photos');

const folders = fs.readdirSync(photosDir)
  .filter(f => fs.statSync(path.join(photosDir, f)).isDirectory());

let updated = 0;

for (const folder of folders) {
  const jsonPath = path.join(publicDir, `wedding-data_${folder}.json`);
  if (!fs.existsSync(jsonPath)) continue;

  const galleryFiles = fs.readdirSync(path.join(photosDir, folder))
    .filter(f => /^gallery\d+\.jpg$/i.test(f))
    .sort((a, b) => {
      const n = f => parseInt(f.match(/\d+/)[0], 10);
      return n(a) - n(b);
    });

  if (galleryFiles.length === 0) continue;

  const newLocal = galleryFiles.map(f => `./photos/[event-folder]/${f}`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Preserve any hotlinked (http/https) gallery entries — those are photos
  // too large for this repo's storage and are intentionally external.
  const existingRemote = (Array.isArray(data.gallery) ? data.gallery : [])
    .filter(g => /^https?:\/\//i.test(g));

  const newGallery = [...newLocal, ...existingRemote];

  if (JSON.stringify(data.gallery) === JSON.stringify(newGallery)) continue;

  data.gallery = newGallery;
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Updated ${folder}: ${newGallery.length} gallery photo(s)`);
  updated++;
}

console.log(`Done — ${updated} JSON file(s) updated.`);
