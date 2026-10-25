import React, { useEffect, useState } from 'react';
import { Language } from '../types';
import LanguageSwitch from './LanguageSwitch';

interface TemplateEntry {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  previewImage: string;
}

const T = {
  en: {
    title: 'Choose Your Invitation',
    subtitle: 'Pick a design below, then customize it with your own names, date, and details.',
    useThis: 'Customize this template',
    loading: 'Loading templates…',
    empty: 'No templates available right now — please check back soon.'
  },
  ja: {
    title: 'デザインを選んでください',
    subtitle: '下のデザインから選んで、お名前や日付などを入力してください。',
    useThis: 'このテンプレートを使う',
    loading: '読み込み中…',
    empty: '現在利用可能なテンプレートはありません。'
  },
  my: {
    title: 'သင့်ဖိတ်စာကို ရွေးချယ်ပါ',
    subtitle: 'အောက်ပါ ဒီဇိုင်းများထဲမှ ရွေးချယ်ပြီး သင့်ကိုယ်ပိုင် အချက်အလက်များ ဖြည့်ပါ။',
    useThis: 'ဤတမ်ပလိတ်ကို အသုံးပြုမည်',
    loading: 'လုပ်ဆောင်နေသည်…',
    empty: 'ယခုအချိန်တွင် တမ်ပလိတ်များ မရှိပါ။'
  }
};

interface Props {
  lang: Language;
  setLang: (l: Language) => void;
}

const Catalog: React.FC<Props> = ({ lang, setLang }) => {
  const t = T[lang];
  const [templates, setTemplates] = useState<TemplateEntry[] | null>(null);

  useEffect(() => {
    fetch('./templates.json')
      .then(res => res.json())
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1
          className="text-xl font-semibold text-[#4A4A4A]"
          style={{ fontFamily: '"Cormorant Garamond", serif' }}
        >
          {t.title}
        </h1>
        <LanguageSwitch current={lang} onChange={setLang} />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-500 mb-8 text-center">{t.subtitle}</p>

        {templates === null && (
          <p className="text-center text-gray-400">{t.loading}</p>
        )}

        {templates !== null && templates.length === 0 && (
          <p className="text-center text-gray-400">{t.empty}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {templates?.map(tpl => (
            <div key={tpl.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img src={tpl.previewImage} alt={tpl.name[lang] || tpl.name.en} className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h2 className="text-lg font-semibold text-[#4A4A4A] mb-1">{tpl.name[lang] || tpl.name.en}</h2>
                <p className="text-sm text-gray-500 mb-4">{tpl.description[lang] || tpl.description.en}</p>
                <a
                  href={`?mode=customize&template=${tpl.id}`}
                  className="inline-block w-full text-center bg-[#C5A059] text-white rounded-lg py-3 font-medium hover:bg-[#b8904a] transition-colors"
                >
                  {t.useThis}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Catalog;
