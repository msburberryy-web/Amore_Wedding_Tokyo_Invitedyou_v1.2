import React, { useEffect, useMemo, useState } from 'react';
import { Language } from '../types';
import LanguageSwitch from './LanguageSwitch';

const API_BASE = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/$/, '');

interface TemplateEntry {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  previewImage: string;
}

interface ScheduleRow { time: string; titleEn: string; icon: string }
interface FaqRow { questionEn: string; answerEn: string; icon: string }

const SCHEDULE_ICONS = ['reception', 'ceremony', 'toast', 'meal', 'camera', 'party', 'end'];
const FAQ_ICONS = ['users', 'shirt', 'clock', 'map', 'utensils', 'calendar', 'gift', 'baby', 'info'];

const T = {
  en: {
    title: 'Customize Your Invitation',
    back: '← Back to catalog',
    sectionBasics: 'The Basics',
    sectionVenue: 'Venue & Message',
    sectionSchedule: 'Schedule',
    sectionFaq: 'FAQ',
    sectionDress: 'Dress Code',
    sectionMedia: 'Photos & Music (by URL)',
    groomName: "Groom's name",
    brideName: "Bride's name",
    date: 'Wedding date',
    rsvpDeadline: 'RSVP deadline (optional)',
    locationName: 'Venue name (optional)',
    locationAddress: 'Venue address (optional)',
    mapUrl: 'Google Maps link (optional)',
    message: 'Welcome message',
    messageHelp: 'Shown on the main invitation page. Leave a language blank to use the template default.',
    slug: 'Your invitation link ID',
    slugHelp: 'Lowercase, format: groomfirstname.bridefirstname — this becomes your link.',
    contactEmail: 'Your email (optional, so we can reach you)',
    addRow: '+ Add',
    remove: 'Remove',
    time: 'Time',
    scheduleTitle: 'Event name',
    icon: 'Icon',
    question: 'Question',
    answer: 'Answer',
    dressShow: 'Show a dress-code color palette',
    dressColor: 'Color',
    dressNote: 'Note shown above the colors (optional)',
    heroUrl: 'Cover photo URL',
    groomUrl: 'Groom photo URL',
    brideUrl: 'Bride photo URL',
    bgUrl: 'Background artwork URL (the "Starry Night" style — optional, leave blank for a plain light background)',
    galleryUrls: 'Gallery photo URLs (one per line)',
    musicUrl: 'Background music URL (.mp3, optional)',
    submit: 'Submit for Review',
    submitting: 'Submitting…',
    required: 'Required',
    optional: 'Optional',
    successTitle: 'Submitted!',
    successMsg: 'Your invitation has been sent for review. We will reach out once it is approved and live.',
    errorGeneric: 'Something went wrong. Please try again.',
    missingFields: 'Please fill in the required fields.',
    previewAlt: 'Template preview'
  },
  ja: {
    title: '招待状をカスタマイズ',
    back: '← カタログに戻る',
    sectionBasics: '基本情報',
    sectionVenue: '会場・メッセージ',
    sectionSchedule: '進行スケジュール',
    sectionFaq: 'Q&A',
    sectionDress: 'ドレスコード',
    sectionMedia: '写真・音楽（URL）',
    groomName: '新郎のお名前',
    brideName: '新婦のお名前',
    date: '挙式日',
    rsvpDeadline: '返信期限（任意）',
    locationName: '会場名（任意）',
    locationAddress: '会場の住所（任意）',
    mapUrl: 'Google マップのリンク（任意）',
    message: 'ウェルカムメッセージ',
    messageHelp: '招待状トップページに表示されます。空欄の言語はテンプレートの標準文になります。',
    slug: '招待状のリンクID',
    slugHelp: '小文字で「新郎名.新婦名」の形式にしてください。これがリンクになります。',
    contactEmail: 'メールアドレス（任意、ご連絡用）',
    addRow: '＋ 追加',
    remove: '削除',
    time: '時刻',
    scheduleTitle: '項目名',
    icon: 'アイコン',
    question: '質問',
    answer: '回答',
    dressShow: 'ドレスコードのカラーパレットを表示する',
    dressColor: '色',
    dressNote: '色の上に表示する説明文（任意）',
    heroUrl: 'カバー写真のURL',
    groomUrl: '新郎写真のURL',
    brideUrl: '新婦写真のURL',
    bgUrl: '背景アートのURL（「星月夜」スタイル・任意、空欄なら無地の明るい背景になります）',
    galleryUrls: 'ギャラリー写真のURL（1行に1つ）',
    musicUrl: 'BGMのURL（.mp3、任意）',
    submit: '確認のため送信',
    submitting: '送信中…',
    required: '必須',
    optional: '任意',
    successTitle: '送信完了！',
    successMsg: '招待状を送信しました。承認されましたらご連絡いたします。',
    errorGeneric: '問題が発生しました。もう一度お試しください。',
    missingFields: '必須項目を入力してください。',
    previewAlt: 'テンプレートのプレビュー'
  },
  my: {
    title: 'သင့်ဖိတ်စာကို စိတ်ကြိုက်ပြင်ပါ',
    back: '← တမ်ပလိတ်များသို့ ပြန်သွားမည်',
    sectionBasics: 'အခြေခံ အချက်အလက်',
    sectionVenue: 'ခမ်းမနှင့် စာသား',
    sectionSchedule: 'အစီအစဉ်',
    sectionFaq: 'မေးခွန်းများ',
    sectionDress: 'ဝတ်စားဆင်ယင်မှု',
    sectionMedia: 'ဓာတ်ပုံ နှင့် သီချင်း (URL)',
    groomName: 'မင်္ဂလာဖူးသူ အမည်',
    brideName: 'မင်္ဂလာဆောင်သူ အမည်',
    date: 'မင်္ဂလာပွဲ ရက်စွဲ',
    rsvpDeadline: 'အကြောင်းပြန်ရန် နောက်ဆုံးရက် (ရွေးချယ်နိုင်သည်)',
    locationName: 'ခမ်းမအမည် (ရွေးချယ်နိုင်သည်)',
    locationAddress: 'ခမ်းမလိပ်စာ (ရွေးချယ်နိုင်သည်)',
    mapUrl: 'Google Maps လင့်ခ် (ရွေးချယ်နိုင်သည်)',
    message: 'နှုတ်ဆက်စာသား',
    messageHelp: 'ဖိတ်စာ ပင်မစာမျက်နှာတွင် ပြပါမည်။ ဘာသာစကား တစ်ခုကို အလွတ်ထားပါက တမ်ပလိတ် standard စာသားကို အသုံးပြုပါမည်။',
    slug: 'သင့်ဖိတ်စာ လင့်ခ် ID',
    slugHelp: 'စာလုံးသေး၊ ပုံစံ: groom.bride — ဤသည်မှာ သင့်လင့်ခ်ဖြစ်လာမည်။',
    contactEmail: 'သင့်အီးမေးလ် (ရွေးချယ်နိုင်သည်)',
    addRow: '+ ထပ်ထည့်မည်',
    remove: 'ဖယ်ရှားမည်',
    time: 'အချိန်',
    scheduleTitle: 'အစီအစဉ် အမည်',
    icon: 'Icon',
    question: 'မေးခွန်း',
    answer: 'အဖြေ',
    dressShow: 'ဝတ်စားဆင်ယင်မှု အရောင်များ ပြမည်',
    dressColor: 'အရောင်',
    dressNote: 'အရောင်များအပေါ်တွင် ပြသည့် မှတ်ချက် (ရွေးချယ်နိုင်သည်)',
    heroUrl: 'မျက်နှာဖုံးဓာတ်ပုံ URL',
    groomUrl: 'မင်္ဂလာဖူးသူ ဓာတ်ပုံ URL',
    brideUrl: 'မင်္ဂလာဆောင်သူ ဓာတ်ပုံ URL',
    bgUrl: 'နောက်ခံပန်းချီ URL ("ကြယ်စုံည" style — ရွေးချယ်နိုင်သည်၊ အလွတ်ထားပါက ရိုးရှင်းသော အလင်းနောက်ခံ ဖြစ်မည်)',
    galleryUrls: 'ဓာတ်ပုံများ URL (တစ်လိုင်းလျှင် တစ်ခု)',
    musicUrl: 'နောက်ခံသီချင်း URL (.mp3, ရွေးချယ်နိုင်သည်)',
    submit: 'စစ်ဆေးရန် တင်ပြမည်',
    submitting: 'တင်ပြနေသည်…',
    required: 'လိုအပ်သည်',
    optional: 'ရွေးချယ်နိုင်သည်',
    successTitle: 'တင်ပြပြီးပါပြီ!',
    successMsg: 'သင့်ဖိတ်စာကို စစ်ဆေးရန် ပေးပို့ပြီးပါပြီ။ အတည်ပြုပြီးပါက ဆက်သွယ်ပေးပါမည်။',
    errorGeneric: 'တစ်ခုခု မှားယွင်းနေသည်။ ထပ်ကြိုးစားပါ။',
    missingFields: 'လိုအပ်သော အကွက်များကို ဖြည့်ပါ။',
    previewAlt: 'တမ်ပလိတ် နမူနာ'
  }
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

interface Props {
  templateId: string;
  lang: Language;
  setLang: (l: Language) => void;
}

const CustomizeForm: React.FC<Props> = ({ templateId, lang, setLang }) => {
  const t = T[lang];
  const [template, setTemplate] = useState<TemplateEntry | null>(null);

  // Basics
  const [groomNameEn, setGroomNameEn] = useState('');
  const [brideNameEn, setBrideNameEn] = useState('');
  const [date, setDate] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  // Venue & message
  const [locationNameEn, setLocationNameEn] = useState('');
  const [locationAddressEn, setLocationAddressEn] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageJa, setMessageJa] = useState('');
  const [messageMy, setMessageMy] = useState('');

  // Schedule
  const [schedule, setSchedule] = useState<ScheduleRow[]>([{ time: '', titleEn: '', icon: 'reception' }]);

  // FAQ
  const [faq, setFaq] = useState<FaqRow[]>([{ questionEn: '', answerEn: '', icon: 'info' }]);

  // Dress code
  const [dressShow, setDressShow] = useState(false);
  const [dressColors, setDressColors] = useState<string[]>(['#C5A059', '#4A4A4A']);
  const [dressNote, setDressNote] = useState('');

  // Media (all by URL — no uploads)
  const [heroUrl, setHeroUrl] = useState('');
  const [groomUrl, setGroomUrl] = useState('');
  const [brideUrl, setBrideUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [galleryUrlsText, setGalleryUrlsText] = useState('');
  const [musicUrl, setMusicUrl] = useState('');

  const [hp, setHp] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('./templates.json')
      .then(res => res.json())
      .then((list: TemplateEntry[]) => setTemplate(list.find(x => x.id === templateId) || null))
      .catch(() => setTemplate(null));
  }, [templateId]);

  const suggestedSlug = useMemo(() => {
    const g = slugify(groomNameEn.split(' ')[0] || '');
    const b = slugify(brideNameEn.split(' ')[0] || '');
    return g && b ? `${g}.${b}` : '';
  }, [groomNameEn, brideNameEn]);

  useEffect(() => {
    if (!slugTouched) setSlug(suggestedSlug);
  }, [suggestedSlug, slugTouched]);

  const canSubmit = groomNameEn.trim() && brideNameEn.trim() && date && slug.trim() && status !== 'submitting';

  const handleSubmit = async () => {
    if (!canSubmit) {
      setErrorMsg(t.missingFields);
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/create-invitation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          slug: slug.trim(),
          groomNameEn: groomNameEn.trim(),
          brideNameEn: brideNameEn.trim(),
          date,
          rsvpDeadline,
          locationNameEn,
          locationAddressEn,
          mapUrl,
          messageEn,
          messageJa,
          messageMy,
          contactEmail,
          schedule: schedule.filter(r => r.time.trim() && r.titleEn.trim()),
          faq: faq.filter(r => r.questionEn.trim() && r.answerEn.trim()),
          dressCode: { show: dressShow, colors: dressColors.filter(Boolean), note: dressNote },
          heroUrl,
          groomUrl,
          brideUrl,
          bgUrl,
          galleryUrls: galleryUrlsText.split('\n').map(s => s.trim()).filter(Boolean),
          musicUrl,
          hp
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || t.errorGeneric);
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setErrorMsg(t.errorGeneric);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <a href="?mode=catalog" className="text-xs text-gray-400 hover:text-[#C5A059]">{t.back}</a>
          <h1 className="text-xl font-semibold text-[#4A4A4A]" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            {t.title}
          </h1>
        </div>
        <LanguageSwitch current={lang} onChange={setLang} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg mx-auto">
          {status === 'done' ? (
            <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-[#4A4A4A] mb-2">{t.successTitle}</h2>
              <p className="text-sm text-gray-500">{t.successMsg}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {template && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                    <img src={template.previewImage} alt={t.previewAlt} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <Section title={t.sectionBasics}>
                <Field label={t.groomName} badge={t.required}>
                  <input className="input" value={groomNameEn} onChange={e => setGroomNameEn(e.target.value)} />
                </Field>
                <Field label={t.brideName} badge={t.required}>
                  <input className="input" value={brideNameEn} onChange={e => setBrideNameEn(e.target.value)} />
                </Field>
                <Field label={t.date} badge={t.required}>
                  <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
                </Field>
                <Field label={t.rsvpDeadline} badge={t.optional}>
                  <input type="date" className="input" value={rsvpDeadline} onChange={e => setRsvpDeadline(e.target.value)} />
                </Field>
                <Field label={t.slug} badge={t.required}>
                  <input
                    className="input"
                    value={slug}
                    onChange={e => { setSlugTouched(true); setSlug(e.target.value.toLowerCase()); }}
                    placeholder="groom.bride"
                  />
                  <p className="text-xs text-gray-400 mt-1">{t.slugHelp}</p>
                </Field>
                <Field label={t.contactEmail} badge={t.optional}>
                  <input type="email" className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </Field>
              </Section>

              <Section title={t.sectionVenue}>
                <Field label={t.locationName} badge={t.optional}>
                  <input className="input" value={locationNameEn} onChange={e => setLocationNameEn(e.target.value)} />
                </Field>
                <Field label={t.locationAddress} badge={t.optional}>
                  <textarea className="input" rows={2} value={locationAddressEn} onChange={e => setLocationAddressEn(e.target.value)} />
                </Field>
                <Field label={t.mapUrl} badge={t.optional}>
                  <input className="input" value={mapUrl} onChange={e => setMapUrl(e.target.value)} />
                </Field>
                <Field label={`${t.message} — EN`} badge={t.optional}>
                  <textarea className="input" rows={3} value={messageEn} onChange={e => setMessageEn(e.target.value)} />
                </Field>
                <Field label={`${t.message} — 日本語`} badge={t.optional}>
                  <textarea className="input" rows={3} value={messageJa} onChange={e => setMessageJa(e.target.value)} />
                </Field>
                <Field label={`${t.message} — မြန်မာ`} badge={t.optional}>
                  <textarea className="input" rows={3} value={messageMy} onChange={e => setMessageMy(e.target.value)} />
                </Field>
                <p className="text-xs text-gray-400">{t.messageHelp}</p>
              </Section>

              <Section title={t.sectionSchedule}>
                {schedule.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <input className="input w-24" placeholder={t.time} value={row.time}
                      onChange={e => setSchedule(prev => prev.map((r, idx) => idx === i ? { ...r, time: e.target.value } : r))} />
                    <input className="input flex-1" placeholder={t.scheduleTitle} value={row.titleEn}
                      onChange={e => setSchedule(prev => prev.map((r, idx) => idx === i ? { ...r, titleEn: e.target.value } : r))} />
                    <select className="input w-28" value={row.icon}
                      onChange={e => setSchedule(prev => prev.map((r, idx) => idx === i ? { ...r, icon: e.target.value } : r))}>
                      {SCHEDULE_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <button type="button" onClick={() => setSchedule(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-gray-400 hover:text-red-500 px-1 py-2">{t.remove}</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setSchedule(prev => [...prev, { time: '', titleEn: '', icon: 'reception' }])}
                  className="text-sm border border-dashed border-[#C5A059] text-[#C5A059] rounded-lg py-2 w-full hover:bg-[#fdf8f0]">
                  {t.addRow}
                </button>
              </Section>

              <Section title={t.sectionFaq}>
                {faq.map((row, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <input className="input flex-1" placeholder={t.question} value={row.questionEn}
                        onChange={e => setFaq(prev => prev.map((r, idx) => idx === i ? { ...r, questionEn: e.target.value } : r))} />
                      <select className="input w-28" value={row.icon}
                        onChange={e => setFaq(prev => prev.map((r, idx) => idx === i ? { ...r, icon: e.target.value } : r))}>
                        {FAQ_ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </div>
                    <textarea className="input" rows={2} placeholder={t.answer} value={row.answerEn}
                      onChange={e => setFaq(prev => prev.map((r, idx) => idx === i ? { ...r, answerEn: e.target.value } : r))} />
                    <button type="button" onClick={() => setFaq(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-xs text-gray-400 hover:text-red-500">{t.remove}</button>
                  </div>
                ))}
                <button type="button"
                  onClick={() => setFaq(prev => [...prev, { questionEn: '', answerEn: '', icon: 'info' }])}
                  className="text-sm border border-dashed border-[#C5A059] text-[#C5A059] rounded-lg py-2 w-full hover:bg-[#fdf8f0]">
                  {t.addRow}
                </button>
              </Section>

              <Section title={t.sectionDress}>
                <label className="flex items-center gap-2 text-sm text-[#4A4A4A]">
                  <input type="checkbox" checked={dressShow} onChange={e => setDressShow(e.target.checked)} />
                  {t.dressShow}
                </label>
                {dressShow && (
                  <>
                    <div className="flex gap-2 flex-wrap">
                      {dressColors.map((c, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input type="color" value={c} onChange={e => setDressColors(prev => prev.map((x, idx) => idx === i ? e.target.value : x))} />
                          <button type="button" onClick={() => setDressColors(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-xs text-gray-400 hover:text-red-500">✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setDressColors(prev => [...prev, '#C5A059'])}
                        className="text-xs border border-dashed border-[#C5A059] text-[#C5A059] rounded px-2">{t.addRow}</button>
                    </div>
                    <Field label={t.dressNote} badge={t.optional}>
                      <input className="input" value={dressNote} onChange={e => setDressNote(e.target.value)} />
                    </Field>
                  </>
                )}
              </Section>

              <Section title={t.sectionMedia}>
                <Field label={t.heroUrl} badge={t.optional}>
                  <input className="input" value={heroUrl} onChange={e => setHeroUrl(e.target.value)} placeholder="https://…" />
                </Field>
                <Field label={t.groomUrl} badge={t.optional}>
                  <input className="input" value={groomUrl} onChange={e => setGroomUrl(e.target.value)} placeholder="https://…" />
                </Field>
                <Field label={t.brideUrl} badge={t.optional}>
                  <input className="input" value={brideUrl} onChange={e => setBrideUrl(e.target.value)} placeholder="https://…" />
                </Field>
                <Field label={t.bgUrl} badge={t.optional}>
                  <input className="input" value={bgUrl} onChange={e => setBgUrl(e.target.value)} placeholder="https://…" />
                </Field>
                <Field label={t.galleryUrls} badge={t.optional}>
                  <textarea className="input" rows={3} value={galleryUrlsText} onChange={e => setGalleryUrlsText(e.target.value)} placeholder="https://…\nhttps://…" />
                </Field>
                <Field label={t.musicUrl} badge={t.optional}>
                  <input className="input" value={musicUrl} onChange={e => setMusicUrl(e.target.value)} placeholder="https://…" />
                </Field>
              </Section>

              {/* Honeypot — hidden from real users, bots that fill it get silently ignored server-side */}
              <input
                type="text"
                value={hp}
                onChange={e => setHp(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="absolute opacity-0 pointer-events-none h-0 w-0"
                aria-hidden="true"
              />

              {status === 'error' && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-[#C5A059] text-white rounded-xl py-4 font-medium text-base disabled:opacity-50 hover:bg-[#b8904a] transition-colors shadow-sm"
              >
                {status === 'submitting' ? t.submitting : t.submit}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`.input { width: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.625rem 0.875rem; font-size: 0.95rem; } .input:focus { outline: none; border-color: #C5A059; }`}</style>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
    <h3 className="text-sm font-semibold text-[#C5A059] uppercase tracking-wide">{title}</h3>
    {children}
  </div>
);

const Field: React.FC<{ label: string; badge?: string; children: React.ReactNode }> = ({ label, badge, children }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-sm font-medium text-[#4A4A4A]">{label}</span>
      {badge && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{badge}</span>}
    </div>
    {children}
  </div>
);

export default CustomizeForm;
