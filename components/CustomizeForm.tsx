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

const T = {
  en: {
    title: 'Customize Your Invitation',
    back: '← Back to catalog',
    groomName: "Groom's name",
    brideName: "Bride's name",
    date: 'Wedding date',
    rsvpDeadline: 'RSVP deadline (optional)',
    locationName: 'Venue name (optional)',
    locationAddress: 'Venue address (optional)',
    mapUrl: 'Google Maps link (optional)',
    message: 'Welcome message (optional)',
    slug: 'Your invitation link ID',
    slugHelp: 'Lowercase, format: groomfirstname.bridefirstname — this becomes your link.',
    contactEmail: 'Your email (optional, so we can reach you)',
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
    groomName: '新郎のお名前',
    brideName: '新婦のお名前',
    date: '挙式日',
    rsvpDeadline: '返信期限（任意）',
    locationName: '会場名（任意）',
    locationAddress: '会場の住所（任意）',
    mapUrl: 'Google マップのリンク（任意）',
    message: 'ウェルカムメッセージ（任意）',
    slug: '招待状のリンクID',
    slugHelp: '小文字で「新郎名.新婦名」の形式にしてください。これがリンクになります。',
    contactEmail: 'メールアドレス（任意、ご連絡用）',
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
    groomName: 'မင်္ဂလာဖူးသူ အမည်',
    brideName: 'မင်္ဂလာဆောင်သူ အမည်',
    date: 'မင်္ဂလာပွဲ ရက်စွဲ',
    rsvpDeadline: 'အကြောင်းပြန်ရန် နောက်ဆုံးရက် (ရွေးချယ်နိုင်သည်)',
    locationName: 'ခမ်းမအမည် (ရွေးချယ်နိုင်သည်)',
    locationAddress: 'ခမ်းမလိပ်စာ (ရွေးချယ်နိုင်သည်)',
    mapUrl: 'Google Maps လင့်ခ် (ရွေးချယ်နိုင်သည်)',
    message: 'နှုတ်ဆက်စာသား (ရွေးချယ်နိုင်သည်)',
    slug: 'သင့်ဖိတ်စာ လင့်ခ် ID',
    slugHelp: 'စာလုံးသေး၊ ပုံစံ: groom.bride — ဤသည်မှာ သင့်လင့်ခ်ဖြစ်လာမည်။',
    contactEmail: 'သင့်အီးမေးလ် (ရွေးချယ်နိုင်သည်)',
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

  const [groomNameEn, setGroomNameEn] = useState('');
  const [brideNameEn, setBrideNameEn] = useState('');
  const [date, setDate] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [locationNameEn, setLocationNameEn] = useState('');
  const [locationAddressEn, setLocationAddressEn] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
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
          contactEmail,
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

              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
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
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                <Field label={t.locationName} badge={t.optional}>
                  <input className="input" value={locationNameEn} onChange={e => setLocationNameEn(e.target.value)} />
                </Field>
                <Field label={t.locationAddress} badge={t.optional}>
                  <textarea className="input" rows={2} value={locationAddressEn} onChange={e => setLocationAddressEn(e.target.value)} />
                </Field>
                <Field label={t.mapUrl} badge={t.optional}>
                  <input className="input" value={mapUrl} onChange={e => setMapUrl(e.target.value)} />
                </Field>
                <Field label={t.message} badge={t.optional}>
                  <textarea className="input" rows={3} value={messageEn} onChange={e => setMessageEn(e.target.value)} />
                </Field>
                <Field label={t.contactEmail} badge={t.optional}>
                  <input type="email" className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                </Field>
              </div>

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
