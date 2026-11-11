import { githubRequest } from './_github.js';
import { buildInvitation, validateSubmission } from '../lib/invitation-draft.mjs';

const repo = '/repos/msburberryy-web/Amore_Wedding_Tokyo_Invitedyou_v1.2';
const base = 'main';
const allowedOrigins = new Set(['https://msburberryy-web.github.io']);

async function fileAt(path, ref) {
  return githubRequest(`${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`, 'GET');
}

function decode(file) {
  return Buffer.from(file.content, 'base64').toString('utf8');
}

export default async function handler(req, res) {
  const origin = req.headers?.origin;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({ error: 'Use the invitation catalog to submit your draft.' });
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!req.headers?.['content-type']?.startsWith('application/json')) return res.status(415).json({ error: 'Submit the form as JSON.' });

  const body = req.body;
  if (body?.hp) return res.status(400).json({ error: 'Please resubmit the form.' });
  if (Buffer.byteLength(JSON.stringify(body ?? null), 'utf8') > 160_000) {
    return res.status(413).json({ error: 'The draft is too large. Shorten text or remove media links.' });
  }
  const { errors, value } = validateSubmission(body);
  if (!value) return res.status(400).json({ error: 'Please correct the highlighted fields.', errors });

  const { templateId, slug, customization } = value;
  const folder = slug.replace('.', '_');
  const branch = `invitation/${folder}`;
  const path = `public/wedding-data_${folder}.json`;

  try {
    const baseRef = await githubRequest(`${repo}/git/ref/heads/${base}`, 'GET');
    if (baseRef.status !== 200) throw new Error('base ref');
    const baseSha = baseRef.body.object.sha;

    const [seedFile, publishedFile] = await Promise.all([
      fileAt(`public/templates/${templateId}.json`, baseSha),
      fileAt(path, baseSha),
    ]);
    if (seedFile.status !== 200) throw new Error('template seed');
    if (publishedFile.status === 200) return res.status(409).json({ error: 'That invitation link already exists. Choose a different link ID.' });
    if (publishedFile.status !== 404) throw new Error('check link');

    const invitation = buildInvitation(JSON.parse(decode(seedFile.body)), customization);
    const content = JSON.stringify(invitation, null, 2) + '\n';
    const existing = await fileAt(path, branch);
    if (existing.status === 200) {
      if (decode(existing.body) !== content) return res.status(409).json({ error: 'A different draft already uses that link ID. Choose another ID or contact the studio.' });
    } else if (existing.status === 404) {
      const parent = await githubRequest(`${repo}/git/commits/${baseSha}`, 'GET');
      if (parent.status !== 200) throw new Error('parent commit');
      const tree = await githubRequest(`${repo}/git/trees`, 'POST', {
        base_tree: parent.body.tree.sha,
        tree: [{ path, mode: '100644', type: 'blob', content }],
      });
      if (tree.status !== 201) throw new Error('invitation tree');
      const commit = await githubRequest(`${repo}/git/commits`, 'POST', {
        message: `Add invitation data for ${slug}`, tree: tree.body.sha, parents: [baseSha],
      });
      if (commit.status !== 201) throw new Error('invitation commit');
      const ref = await githubRequest(`${repo}/git/refs`, 'POST', {
        ref: `refs/heads/${branch}`, sha: commit.body.sha,
      });
      if (ref.status !== 201) {
        if (ref.status === 422) return res.status(409).json({ error: 'This link ID is already in review. If you just submitted it, try again.' });
        throw new Error('invitation branch');
      }
    } else {
      throw new Error('draft branch check');
    }

    const comparison = await githubRequest(`${repo}/compare/${baseSha}...${encodeURIComponent(branch)}`, 'GET');
    if (comparison.status !== 200) throw new Error('draft comparison');
    if (comparison.body.files?.length !== 1 || comparison.body.files[0].filename !== path || comparison.body.files[0].status !== 'added') {
      return res.status(409).json({ error: 'That branch contains other changes. Contact the studio before resubmitting.' });
    }

    const head = encodeURIComponent(`msburberryy-web:${branch}`);
    const prs = await githubRequest(`${repo}/pulls?head=${head}&base=${base}&state=all`, 'GET');
    if (prs.status !== 200) throw new Error('PR lookup');
    if (prs.body.some(pr => pr.state === 'open')) return res.status(200).json({ success: true, reference: slug });
    if (prs.body.length) return res.status(409).json({ error: 'A previous review exists for this link ID. Please contact the studio.' });

    const pr = await githubRequest(`${repo}/pulls`, 'POST', {
      title: `Review invitation: ${slug}`,
      head: branch,
      base,
      body: [
        `Template: \`${templateId}\``,
        `Invitation URL after merge: \`?event=${slug}\``,
        '',
        `Changes: \`${path}\` only.`,
        'Review the customer-facing invitation text and media before merging. Configure the RSVP destination separately if needed.',
      ].join('\n'),
    });
    if (pr.status !== 201) throw new Error('open PR');
    return res.status(201).json({ success: true, reference: slug });
  } catch (error) {
    console.error('Invitation review could not be created:', error instanceof Error ? error.message : 'unknown');
    return res.status(503).json({ error: 'The review could not be confirmed. Try again with the same link ID and details.' });
  }
}
