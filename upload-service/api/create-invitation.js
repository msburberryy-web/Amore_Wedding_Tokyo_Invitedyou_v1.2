import { githubRequest } from './_github.js';

const REPO_OWNER   = 'msburberryy-web';
const REPO_NAME    = 'Amore_Wedding_Tokyo_Invitedyou_v1.2';
const BASE_BRANCH  = 'main';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const SLUG_RE = /^[a-z0-9]{2,20}\.[a-z0-9]{2,20}$/;
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const URL_RE = /^https?:\/\/\S+$/;
const SCHEDULE_ICONS = new Set(['ceremony', 'reception', 'party', 'toast', 'meal', 'camera', 'end']);
const FAQ_ICONS = new Set(['users', 'shirt', 'clock', 'map', 'utensils', 'calendar', 'gift', 'info', 'baby']);

function clean(value, max) {
  return (typeof value === 'string' ? value : '').trim().slice(0, max);
}

function cleanUrl(value, max) {
  const v = clean(value, max);
  return URL_RE.test(v) ? v : '';
}

function cleanSchedule(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).map(row => ({
    time: clean(row?.time, 20),
    titleEn: clean(row?.titleEn, 120),
    icon: SCHEDULE_ICONS.has(row?.icon) ? row.icon : 'reception'
  })).filter(r => r.time && r.titleEn);
}

function cleanFaq(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).map(row => ({
    questionEn: clean(row?.questionEn, 300),
    answerEn: clean(row?.answerEn, 3000),
    icon: FAQ_ICONS.has(row?.icon) ? row.icon : 'info'
  })).filter(r => r.questionEn && r.answerEn);
}

function cleanColors(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 8).map(c => clean(c, 10)).filter(c => HEX_RE.test(c));
}

function cleanGalleryUrls(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).map(u => cleanUrl(u, 1000)).filter(Boolean);
}

async function getFileJson(path) {
  const res = await githubRequest(
    `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BASE_BRANCH}`,
    'GET'
  );
  if (res.status !== 200) return { status: res.status, json: null };
  const json = JSON.parse(Buffer.from(res.body.content, 'base64').toString('utf-8'));
  return { status: 200, json };
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};

  // Honeypot — bots that fill hidden fields get a fake success, no PR is created.
  if (body.hp) return res.status(200).json({ success: true });

  const templateId        = clean(body.templateId, 40);
  const slug               = clean(body.slug, 42).toLowerCase();
  const groomNameEn        = clean(body.groomNameEn, 120);
  const brideNameEn        = clean(body.brideNameEn, 120);
  const date               = clean(body.date, 40);
  const rsvpDeadline        = clean(body.rsvpDeadline, 40);
  const locationNameEn      = clean(body.locationNameEn, 120);
  const locationAddressEn   = clean(body.locationAddressEn, 2000);
  const mapUrl              = clean(body.mapUrl, 1000);
  const messageEn           = clean(body.messageEn, 4000);
  const messageJa           = clean(body.messageJa, 4000);
  const messageMy           = clean(body.messageMy, 4000);
  const contactEmail        = clean(body.contactEmail, 200);
  const schedule            = cleanSchedule(body.schedule);
  const faq                 = cleanFaq(body.faq);
  const dressShow           = !!(body.dressCode && body.dressCode.show);
  const dressColors         = cleanColors(body.dressCode && body.dressCode.colors);
  const dressNote           = clean(body.dressCode && body.dressCode.note, 300);
  const heroUrl             = cleanUrl(body.heroUrl, 1000);
  const groomUrl            = cleanUrl(body.groomUrl, 1000);
  const brideUrl            = cleanUrl(body.brideUrl, 1000);
  const bgUrl               = cleanUrl(body.bgUrl, 1000);
  const galleryUrls         = cleanGalleryUrls(body.galleryUrls);
  const musicUrl            = cleanUrl(body.musicUrl, 1000);

  if (!templateId || !slug || !groomNameEn || !brideNameEn || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!SLUG_RE.test(slug)) {
    return res.status(400).json({ error: 'Link ID must look like groom.bride (lowercase letters/numbers only)' });
  }

  const folder = slug.replace(/\./g, '_');

  try {
    // 1. Load the chosen template seed
    const { status: templateStatus, json: templateJson } = await getFileJson(`public/templates/${templateId}.json`);
    if (templateStatus !== 200 || !templateJson) {
      return res.status(400).json({ error: 'Unknown template' });
    }

    // 2. Make sure this link isn't already taken
    const { status: existingStatus } = await getFileJson(`public/wedding-data_${folder}.json`);
    if (existingStatus === 200) {
      return res.status(409).json({ error: 'That link is already taken — please choose another' });
    }

    // 3. Merge the couple's text into the template
    const merged = {
      ...templateJson,
      groomName: { ...templateJson.groomName, en: groomNameEn },
      brideName: { ...templateJson.brideName, en: brideNameEn },
      date,
      rsvpDeadline: rsvpDeadline || templateJson.rsvpDeadline,
      location: {
        ...templateJson.location,
        name: { ...templateJson.location.name, en: locationNameEn || templateJson.location.name.en },
        address: { ...templateJson.location.address, en: locationAddressEn || templateJson.location.address.en },
        mapUrl: mapUrl || templateJson.location.mapUrl
      },
      message: {
        en: messageEn || templateJson.message.en,
        ja: messageJa || templateJson.message.ja,
        my: messageMy || templateJson.message.my
      },
      schedule: schedule.length > 0
        ? schedule.map(row => ({ time: row.time, title: { en: row.titleEn, ja: '', my: '' }, icon: row.icon }))
        : templateJson.schedule,
      faq: faq.length > 0
        ? faq.map(row => ({ question: { en: row.questionEn, ja: '', my: '' }, answer: { en: row.answerEn, ja: '', my: '' }, icon: row.icon }))
        : templateJson.faq,
      dressCode: dressShow
        ? { show: true, colors: dressColors.length > 0 ? dressColors : ['#C5A059', '#4A4A4A'], note: { en: dressNote, ja: '', my: '' } }
        : (templateJson.dressCode || { show: false, colors: [], note: { en: '', ja: '', my: '' } }),
      gallery: galleryUrls.length > 0 ? galleryUrls : templateJson.gallery,
      musicUrl: musicUrl || templateJson.musicUrl,
      images: {
        hero: heroUrl || templateJson.images.hero,
        groom: groomUrl || templateJson.images.groom,
        bride: brideUrl || templateJson.images.bride,
        pageBackground: bgUrl || templateJson.images.pageBackground
      }
    };

    // 4. Create a new branch off main
    const refRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/${BASE_BRANCH}`, 'GET');
    if (refRes.status !== 200) throw new Error('Failed to read base branch');
    const baseSha = refRes.body.object.sha;

    const branchName = `invitation/${folder}-${Date.now().toString(36)}`;
    const createRefRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`, 'POST', {
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    });
    if (createRefRes.status !== 201) throw new Error('Failed to create branch');

    // 5. Commit the new wedding-data JSON to that branch
    const content = Buffer.from(JSON.stringify(merged, null, 2) + '\n', 'utf-8').toString('base64');
    const putRes = await githubRequest(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/public/wedding-data_${folder}.json`,
      'PUT',
      { message: `New self-service invitation: ${groomNameEn} & ${brideNameEn}`, content, branch: branchName }
    );
    if (putRes.status !== 201) throw new Error('Failed to commit invitation file');

    // 6. Open the PR for manual review
    const prBodyLines = [
      '**New self-service invitation submitted via the template catalog.**',
      '',
      `- Template: \`${templateId}\``,
      `- Groom: ${groomNameEn}`,
      `- Bride: ${brideNameEn}`,
      `- Date: ${date}`,
      `- Link: ?event=${slug}`,
      contactEmail ? `- Contact: ${contactEmail}` : '',
      '',
      'Review the content, then merge to go live. Once merged, the usual upload-code flow lets the couple add their own photos.'
    ].filter(Boolean);

    const prRes = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, 'POST', {
      title: `New invitation: ${groomNameEn} & ${brideNameEn}`,
      head: branchName,
      base: BASE_BRANCH,
      body: prBodyLines.join('\n')
    });
    if (prRes.status !== 201) throw new Error('Failed to open PR');

    return res.status(200).json({ success: true, prUrl: prRes.body.html_url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
