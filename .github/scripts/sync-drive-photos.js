/**
 * sync-drive-photos.js
 *
 * Downloads all images from a Google Drive folder, resizes/compresses them
 * for web use, writes them into public/photos/{eventFolder}/, and updates
 * the gallery array + image paths in the matching wedding-data JSON.
 *
 * Usage:
 *   node .github/scripts/sync-drive-photos.js <driveFolderId> <eventFolder>
 *
 * Required env:
 *   GOOGLE_SA_KEY  — Google service account JSON (base64-encoded or raw JSON string)
 *
 * Naming convention expected in Drive folder:
 *   cover.jpg / cover.jpeg / cover.png  → images.hero
 *   groom.jpg  / groom.jpeg             → images.groom
 *   bride.jpg  / bride.jpeg             → images.bride
 *   gallery1.jpg, gallery2.jpg …        → gallery[]
 *   (any other image is treated as a gallery photo, appended in name order)
 *
 * Source photos are often straight-off-camera originals (20+ MP, 10-25MB,
 * no resizing) — committing those as-is bloats the repo and can silently
 * fail to render on memory-constrained mobile browsers. Every downloaded
 * image is resized (max 2000px on the long edge, EXIF-rotated, re-encoded
 * as JPEG q82) before being written to disk, regardless of source format.
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const [,, FOLDER_ID, EVENT_FOLDER] = process.argv;
if (!FOLDER_ID || !EVENT_FOLDER) {
  console.error('Usage: node sync-drive-photos.js <driveFolderId> <eventFolder>');
  process.exit(1);
}

const MAX_DIMENSION = 2000; // px, long edge
const JPEG_QUALITY = 82;

// ── Google Service Account Auth ───────────────────────────────────────────────

function parseSaKey() {
  const raw = process.env.GOOGLE_SA_KEY || '';
  if (!raw) throw new Error('GOOGLE_SA_KEY env var is not set');
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = base64url(sign.sign(sa.private_key));
  const jwt = `${header}.${payload}.${sig}`;

  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (!json.access_token) reject(new Error(`Auth failed: ${data}`));
        else resolve(json.access_token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Drive API helpers ─────────────────────────────────────────────────────────

function driveRequest(path, token) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'www.googleapis.com',
      path,
      headers: { Authorization: `Bearer ${token}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// Downloads the file into memory and returns a Buffer. Does NOT write to
// disk directly — callers must resize/re-encode via sharp before saving,
// since source files are often unresized camera originals.
function downloadFileToBuffer(fileId, token) {
  return new Promise((resolve, reject) => {
    const request = (reqUrl, reqHeaders) => {
      const opts = typeof reqUrl === 'string'
        ? new URL(reqUrl)
        : { hostname: 'www.googleapis.com', path: `/drive/v3/files/${fileId}?alt=media` };
      https.get({ ...opts, headers: reqHeaders }, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          request(res.headers.location, {}); // redirect target carries its own auth (signed URL)
          return;
        }
        if (res.statusCode !== 200) {
          let errBody = '';
          res.on('data', c => errBody += c);
          res.on('end', () => reject(new Error(`Drive download failed (${res.statusCode}): ${errBody.slice(0, 300)}`)));
          return;
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    request(undefined, { Authorization: `Bearer ${token}` });
  });
}

async function downloadAndSaveResized(fileId, token, destPath) {
  const buffer = await downloadFileToBuffer(fileId, token);
  await sharp(buffer)
    .rotate() // apply EXIF orientation, then strip it (avoids double-rotation in browsers)
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(destPath);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const sa = parseSaKey();
  const token = await getAccessToken(sa);
  console.log('✓ Authenticated with Google Drive');

  // List all image files in the folder
  const listPath = `/drive/v3/files?q=${encodeURIComponent(
    `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`
  )}&fields=files(id,name,mimeType)&pageSize=50`;

  const { files } = await driveRequest(listPath, token);
  if (!files || files.length === 0) {
    console.error('No image files found in Drive folder');
    process.exit(1);
  }
  console.log(`Found ${files.length} image(s):`, files.map(f => f.name).join(', '));

  // Ensure output directory exists
  const photosDir = path.join(__dirname, '..', '..', 'public', 'photos', EVENT_FOLDER);
  fs.mkdirSync(photosDir, { recursive: true });

  // Categorise files — output is always re-encoded as .jpg regardless of source extension
  const named    = { cover: null, groom: null, bride: null };
  const gallery  = [];

  for (const file of files) {
    const base = file.name.toLowerCase().replace(/\.[^.]+$/, ''); // strip extension
    if (base === 'cover')       named.cover = file;
    else if (base === 'groom')  named.groom = file;
    else if (base === 'bride')  named.bride = file;
    else                        gallery.push(file);
  }

  // Sort gallery by file name
  gallery.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Download + resize named images
  for (const [role, file] of Object.entries(named)) {
    if (!file) { console.warn(`  ⚠ No ${role} image found`); continue; }
    const dest = path.join(photosDir, `${role}.jpg`);
    await downloadAndSaveResized(file.id, token, dest);
    const { size } = fs.statSync(dest);
    console.log(`  ↓ ${role}.jpg (${(size / 1024).toFixed(0)}KB, resized from ${file.name})`);
  }

  // Download + resize gallery images, renaming to gallery1.jpg, gallery2.jpg …
  const galleryPaths = [];
  for (let i = 0; i < gallery.length; i++) {
    const file = gallery[i];
    const dest = path.join(photosDir, `gallery${i + 1}.jpg`);
    await downloadAndSaveResized(file.id, token, dest);
    const { size } = fs.statSync(dest);
    console.log(`  ↓ gallery${i + 1}.jpg (${(size / 1024).toFixed(0)}KB, resized from ${file.name})`);
    galleryPaths.push(`./photos/${EVENT_FOLDER}/gallery${i + 1}.jpg`);
  }

  // Update the wedding-data JSON
  const jsonPath = path.join(__dirname, '..', '..', 'public', `wedding-data_${EVENT_FOLDER}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn(`  ⚠ JSON not found at ${jsonPath} — skipping JSON update`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  if (named.cover) data.images.hero  = `./photos/${EVENT_FOLDER}/cover.jpg`;
  if (named.groom) data.images.groom = `./photos/${EVENT_FOLDER}/groom.jpg`;
  if (named.bride) data.images.bride = `./photos/${EVENT_FOLDER}/bride.jpg`;
  if (galleryPaths.length > 0) data.gallery = galleryPaths;

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Updated ${path.basename(jsonPath)}: ${galleryPaths.length} gallery photo(s)`);
}

main().catch(e => { console.error(e); process.exit(1); });
