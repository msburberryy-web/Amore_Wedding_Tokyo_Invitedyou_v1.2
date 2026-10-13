/**
 * post-upload-code.js <folder>
 *
 * Called by deploy.yml after a new wedding-data JSON is merged to main.
 * Finds the Notion task for the couple and writes upload URL + code to its Note.
 * Falls back to creating a new Notion page if no existing task is found.
 *
 * Required env:
 *   NOTION_TOKEN, NOTION_DB_ID, UPLOAD_SECRET, SITE_BASE_URL
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const folder = process.argv[2];
if (!folder) { console.error('Usage: node post-upload-code.js <folder>'); process.exit(1); }

const TOKEN         = process.env.NOTION_TOKEN;
const DB_ID         = process.env.NOTION_DB_ID;
const SITE_BASE_URL = (process.env.SITE_BASE_URL || '').replace(/\/$/, '');
const UPLOAD_SECRET = process.env.UPLOAD_SECRET || '';

if (!TOKEN || !DB_ID) { console.error('Missing NOTION_TOKEN or NOTION_DB_ID'); process.exit(1); }
if (!UPLOAD_SECRET)   { console.error('Missing UPLOAD_SECRET'); process.exit(1); }

const [groomSlug, brideSlug] = folder.split('_');
const eventSlug  = `${groomSlug}.${brideSlug}`;
const uploadCode = crypto.createHmac('sha256', UPLOAD_SECRET).update(folder).digest('hex').slice(0, 8);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath  = path.join(__dirname, '..', '..', 'public', `wedding-data_${folder}.json`);
if (!fs.existsSync(jsonPath)) { console.error(`JSON not found: ${jsonPath}`); process.exit(1); }
const data      = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const groomName = data.groomName?.en || folder;
const brideName = data.brideName?.en || '';

const invitationUrl = SITE_BASE_URL ? `${SITE_BASE_URL}/?event=${eventSlug}` : '';
const uploadUrl     = SITE_BASE_URL ? `${SITE_BASE_URL}/?mode=upload&event=${eventSlug}` : '';
const noteContent   = [
  invitationUrl ? `🔗 Invitation: ${invitationUrl}` : null,
  uploadUrl     ? `📸 Upload: ${uploadUrl}` : null,
  `🔑 Upload Code: ${uploadCode}`,
].filter(Boolean).join('\n');

// ── Notion API ────────────────────────────────────────────────────────────────

function notionRequest(p, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.notion.com',
      path: p,
      method,
      headers: {
        Authorization:    `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(d); } catch { reject(new Error(`Notion non-JSON response: ${d.slice(0, 200)}`)); return; }
        if (json.object === 'error') reject(new Error(`Notion API error ${json.status}: ${json.message}`));
        else resolve(json);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Find task ────────────────────────────────────────────────────────────────

async function findNotionTask() {
  // Search for pages in our DB whose table contains a matching groom_en slug
  const res = await notionRequest('/v1/search', 'POST', {
    query:     groomSlug,
    filter:    { value: 'page', property: 'object' },
    page_size: 20,
  });

  const dbIdNorm = (DB_ID || '').replace(/-/g, '');

  for (const page of res.results || []) {
    const parentDbId = (page.parent?.database_id || '').replace(/-/g, '');
    if (parentDbId !== dbIdNorm) continue;

    const blocksRes = await notionRequest(`/v1/blocks/${page.id}/children`);
    const tableBlock = (blocksRes.results || []).find(b => b.type === 'table');
    if (!tableBlock) continue;

    const rowsRes = await notionRequest(`/v1/blocks/${tableBlock.id}/children`);
    for (const row of rowsRes.results || []) {
      const cells = row.table_row?.cells || [];
      if (cells.length < 2) continue;
      const key = cells[0]?.[0]?.text?.content || '';
      const val = cells[1]?.[0]?.text?.content || '';
      if (key === 'groom_en') {
        const slug = val.toLowerCase().trim().split(/\s+/)[0];
        if (slug === groomSlug) return page;
      }
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nPosting upload code for: ${groomName} & ${brideName} (${folder})`);

  const task = await findNotionTask();

  if (task) {
    await notionRequest(`/v1/pages/${task.id}`, 'PATCH', {
      properties: {
        Note: { rich_text: [{ type: 'text', text: { content: noteContent } }] },
      },
    });
    console.log(`✓ Updated existing Notion task`);
  } else {
    await notionRequest('/v1/pages', 'POST', {
      parent: { database_id: DB_ID },
      properties: {
        Title:  { title: [{ type: 'text', text: { content: `Web invitation — ${groomName} & ${brideName}` } }] },
        Status: { select: { name: 'Done' } },
        Note:   { rich_text: [{ type: 'text', text: { content: noteContent } }] },
      },
    });
    console.log(`✓ Created new Notion page (no existing task found)`);
  }

  console.log(`  Invitation : ${invitationUrl || '(SITE_BASE_URL not set)'}`);
  console.log(`  Upload URL : ${uploadUrl     || '(SITE_BASE_URL not set)'}`);
  console.log(`  Code       : ${uploadCode}`);
}

main().catch(e => { console.error(e.message || e); process.exit(1); });
