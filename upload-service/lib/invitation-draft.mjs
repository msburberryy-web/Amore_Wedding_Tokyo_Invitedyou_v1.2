// This list defines the customer editor and its server-side write allowlist.
export const templateIds = Object.freeze(['starry_night', 'ivory_olive']);
const languages = ['en', 'ja', 'my'];
const localeNames = { en: 'English', ja: '日本語', my: 'မြန်မာ' };
const fontOptions = {
  en: ['"Cormorant Garamond"', '"Playfair Display"', '"Montserrat"'],
  ja: ['"Noto Sans JP"', '"Shippori Mincho"', '"Zen Maru Gothic"'],
  my: ['"Padauk"', '"Noto Serif Myanmar"', '"Noto Sans Myanmar"'],
};

const field = (key, label, kind = 'text', extra = {}) => ({ key, label, kind, ...extra });
const localized = (key, label, extra = {}) => field(key, label, 'group', {
  fields: languages.map(lang => field(lang, localeNames[lang], extra.kind ?? 'text', {
    max: extra.max ?? 120,
    required: lang === 'en' && Boolean(extra.required),
  })),
});
const fontGroup = (key, label) => field(key, label, 'group', {
  fields: languages.map(lang => field(lang, localeNames[lang], 'select', { options: fontOptions[lang] })),
});
const noteGroup = (key, label) => field(key, label, 'group', {
  fields: [field('show', 'Show this note', 'toggle'), localized('text', 'Note', { kind: 'textarea', max: 3000 })],
});
const url = (key, label, kind = 'url') => field(key, label, kind, { max: 2048 });

export const sections = [
  { title: 'Couple & event', fields: [
    localized('groomName', 'Groom’s name', { required: true }),
    localized('brideName', 'Bride’s name', { required: true }),
    field('date', 'Wedding date', 'date', { required: true }),
    field('start_time', 'Start time', 'time'),
    field('end_time', 'End time', 'time'),
    field('rsvpDeadline', 'RSVP deadline', 'date'),
    field('showCountdown', 'Show countdown', 'toggle'),
    localized('message', 'Welcome message', { kind: 'textarea', max: 4000 }),
  ] },
  { title: 'Venue & personal notes', fields: [
    field('location', 'Venue', 'group', { fields: [
      localized('name', 'Venue name'),
      localized('address', 'Venue address', { max: 500 }),
      url('mapUrl', 'Google Maps embed URL', 'map'),
    ] }),
    noteGroup('familyIntro', 'Family introduction'),
    noteGroup('groomNote', 'Note from the groom'),
    noteGroup('brideNote', 'Note from the bride'),
  ] },
  { title: 'Schedule, FAQ & dress code', fields: [
    field('showSchedule', 'Show schedule', 'toggle'),
    field('schedule', 'Schedule entries', 'list', { max: 20, fields: [
      field('time', 'Time', 'time', { required: true }),
      localized('title', 'Title', { required: true }),
      field('icon', 'Icon', 'select', { required: true, options: ['reception', 'ceremony', 'party', 'toast', 'meal', 'camera', 'end'] }),
    ] }),
    field('faq', 'FAQ entries', 'list', { max: 20, fields: [
      localized('question', 'Question', { required: true, max: 300 }),
      localized('answer', 'Answer', { required: true, kind: 'textarea', max: 3000 }),
      field('icon', 'Icon', 'select', { required: true, options: ['info', 'users', 'shirt', 'clock', 'map', 'utensils', 'calendar', 'gift', 'baby'] }),
    ] }),
    field('dressCode', 'Dress code', 'group', { fields: [
      field('show', 'Show dress code', 'toggle'),
      field('colors', 'Dress colors', 'list', { max: 8, item: field('color', 'Color', 'color', { required: true }) }),
      localized('note', 'Dress code note', { kind: 'textarea', max: 500 }),
    ] }),
  ] },
  { title: 'Photos & music', fields: [
    field('images', 'Photos', 'group', { fields: [
      url('hero', 'Cover photo URL'), url('groom', 'Groom photo URL'),
      url('bride', 'Bride photo URL'), url('pageBackground', 'Background image URL'),
    ] }),
    field('showGallery', 'Show photo gallery', 'toggle'),
    field('gallery', 'Gallery images', 'list', { max: 20, item: field('photo', 'Photo URL', 'url', { max: 2048, required: true }) }),
    url('musicUrl', 'Music URL'),
  ] },
  { title: 'Colors, fonts & motion', fields: [
    field('theme', 'Colors', 'group', { fields: [
      field('primary', 'Accent', 'color', { required: true }),
      field('text', 'Text', 'color', { required: true }),
      field('backgroundTint', 'Page tint', 'color', { required: true }),
      field('cardBackground', 'Card background', 'color'),
      field('border', 'Photo frame', 'color'),
    ] }),
    fontGroup('fonts', 'Body fonts'),
    fontGroup('titleFonts', 'Heading fonts'),
    field('visuals', 'Animation', 'group', { fields: [
      field('enableAnimations', 'Enable animations', 'toggle'),
      field('enableEnvelope', 'Show opening envelope', 'toggle'),
    ] }),
  ] },
];

const allowed = sections.flatMap(section => section.fields);
const slugPattern = /^[a-z0-9]{2,20}\.[a-z0-9]{2,20}$/;
const unsafeText = /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|`{3}|&(?:lt|gt|#0*(?:60|62)|#x0*(?:3c|3e));|\b(?:javascript|vbscript)\s*:|\b(?:eval|Function|alert|fetch|require)\s*\(|(?:\bfunction\s*\w*\s*\(|\b(?:import|export)\s+(?:[{'"]|(?:default|const|function)\b)|=>\s*[{(]|\{\s*[^{}\n]+\s*:\s*[^{}\n]+[;}])/iu;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function validateUrl(value, map) {
  if (/[\s<>"'\\`]/u.test(value) || (!map && /[()]/.test(value))) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.includes('.')) return false;
    if (parsed.hostname === 'localhost' || /\.(localhost|local|internal)$/.test(parsed.hostname) || /^[\d.]+$/.test(parsed.hostname)) return false;
    if (!map) return true;
    return (
      (['www.google.com', 'maps.google.com'].includes(parsed.hostname) || parsed.hostname === 'www.google.co.jp')
      && (/^\/maps\/embed(?:\/|$)/.test(parsed.pathname)
        || (parsed.pathname === '/maps' && parsed.searchParams.get('output') === 'embed'))
    );
  } catch {
    return false;
  }
}

function validateObject(fields, input, path, errors) {
  if (!isObject(input)) {
    errors.push(`${path}: expected editable fields.`);
    return {};
  }
  const names = new Set(fields.map(spec => spec.key));
  if (Object.keys(input).some(key => !names.has(key))) errors.push(`${path}: contains an unsupported field.`);
  return Object.fromEntries(fields.map(spec => [spec.key, validateField(spec, input[spec.key], `${path} › ${spec.label}`, errors)]));
}

function validateField(spec, input, path, errors) {
  const fail = message => { errors.push(`${path}: ${message}`); return ''; };
  if (spec.kind === 'group') return validateObject(spec.fields, input, path, errors);
  if (spec.kind === 'toggle') return typeof input === 'boolean' ? input : fail('expected an on/off choice.');
  if (spec.kind === 'list') {
    if (!Array.isArray(input) || input.length > spec.max) return fail(`add up to ${spec.max} entries.`);
    return input.map((entry, index) => spec.item
      ? validateField(spec.item, entry, `${path} #${index + 1}`, errors)
      : validateObject(spec.fields, entry, `${path} #${index + 1}`, errors));
  }
  if (typeof input !== 'string') return fail('expected text or a selected value.');
  const value = input.trim().normalize('NFC');
  if (!value) return spec.required ? fail('required.') : '';
  if (value.length > (spec.max ?? 120)) return fail(`use at most ${spec.max ?? 120} characters.`);
  if (spec.kind === 'date' && !validDate(value)) return fail('choose a valid calendar date.');
  if (spec.kind === 'time' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fail('choose a valid time.');
  if (spec.kind === 'color' && !/^#[0-9a-f]{6}$/i.test(value)) return fail('choose a 6-digit hex color.');
  if (spec.kind === 'select' && !spec.options.includes(value)) return fail('choose one of the listed options.');
  if (spec.kind === 'url' && !validateUrl(value, false)) return fail('enter a public HTTPS media URL.');
  if (spec.kind === 'map' && !validateUrl(value, true)) return fail('paste the HTTPS URL from Google Maps → Share → Embed a map, without the iframe.');
  if (['text', 'textarea'].includes(spec.kind) && unsafeText.test(value)) return fail('plain text only. Remove HTML or code.');
  return value;
}

export function initialValue(spec, seed) {
  if (spec.kind === 'group') return Object.fromEntries(spec.fields.map(child => [child.key, initialValue(child, seed?.[child.key])]));
  if (spec.kind === 'toggle') return seed === true;
  if (spec.kind === 'list') return Array.isArray(seed) ? seed
    .filter(entry => !spec.item || (typeof entry === 'string' && entry.startsWith('https://')))
    .map(entry => spec.item ? initialValue(spec.item, entry) : Object.fromEntries(spec.fields.map(child => [child.key, initialValue(child, entry?.[child.key])]))) : [];
  if (typeof seed === 'string') {
    if (['url', 'map'].includes(spec.kind) && !validateUrl(seed, spec.kind === 'map')) return '';
    if (spec.kind === 'select' && seed && !spec.options.includes(seed)) return spec.required ? spec.options[0] : '';
    if (spec.kind === 'color' && /^#[0-9a-f]{3}$/i.test(seed)) return '#' + [...seed.slice(1)].map(c => c + c).join('');
    return seed;
  }
  return spec.kind === 'select' && spec.required ? spec.options[0] : '';
}

export function createDraft(seed) {
  return Object.fromEntries(allowed.map(spec => [spec.key, initialValue(spec, seed[spec.key])]));
}

export function validateSubmission(input) {
  const errors = [];
  if (!isObject(input) || Object.keys(input).some(key => !['templateId', 'slug', 'publishConsent', 'customization', 'hp'].includes(key))) {
    return { errors: ['The submission includes unsupported fields.'], value: null };
  }
  if (!templateIds.includes(input.templateId)) errors.push('Choose a listed template.');
  if (typeof input.slug !== 'string' || !slugPattern.test(input.slug)) errors.push('The link ID must look like groom.bride, with 2–20 lowercase letters or digits on each side.');
  if (input.publishConsent !== true) errors.push('Confirm that the submitted invitation content will be visible in a public GitHub pull request.');
  const customization = validateObject(allowed, input.customization, 'Invitation', errors);
  if (customization.rsvpDeadline && customization.date && customization.rsvpDeadline > customization.date) {
    errors.push('The RSVP deadline must be on or before the wedding date.');
  }
  return { errors, value: errors.length ? null : { templateId: input.templateId, slug: input.slug, customization } };
}

export function buildInvitation(seed, customization) {
  const { images, gallery, musicUrl, fonts, titleFonts, location, ...details } = customization;
  const fallbackLanguages = value => ({ ...value, ja: value.ja || value.en, my: value.my || value.en });
  const filledFonts = Object.fromEntries(languages.map(lang => [lang, fonts[lang] || seed.fonts[lang]]));
  return {
    ...seed,
    ...details,
    date: details.start_time ? `${details.date}T${details.start_time}:00+09:00` : details.date,
    groomName: fallbackLanguages(details.groomName),
    brideName: fallbackLanguages(details.brideName),
    message: fallbackLanguages(details.message),
    familyIntro: { ...details.familyIntro, text: fallbackLanguages(details.familyIntro.text) },
    groomNote: { ...details.groomNote, text: fallbackLanguages(details.groomNote.text) },
    brideNote: { ...details.brideNote, text: fallbackLanguages(details.brideNote.text) },
    dressCode: { ...details.dressCode, note: fallbackLanguages(details.dressCode.note) },
    schedule: details.schedule.map(row => ({ ...row, title: fallbackLanguages(row.title) })),
    faq: details.faq.map(row => ({ ...row, question: fallbackLanguages(row.question), answer: fallbackLanguages(row.answer) })),
    location: { ...location, name: fallbackLanguages(location.name), address: fallbackLanguages(location.address) },
    images: {
      hero: images.hero || seed.images.hero,
      groom: images.groom || seed.images.groom,
      bride: images.bride || seed.images.bride,
      pageBackground: images.pageBackground || seed.images.pageBackground || '',
    },
    gallery: gallery.length ? gallery : seed.gallery,
    musicUrl: musicUrl || seed.musicUrl,
    fonts: filledFonts,
    titleFonts: Object.fromEntries(languages.map(lang => [lang, titleFonts[lang] || seed.titleFonts?.[lang] || filledFonts[lang]])),
  };
}
