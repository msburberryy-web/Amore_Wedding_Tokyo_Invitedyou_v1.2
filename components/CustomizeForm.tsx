import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Language, WeddingData } from '../types';
import LanguageSwitch from './LanguageSwitch';
import {
  buildInvitation, createDraft, initialValue, sections, templateIds, validateSubmission,
  type Draft, type EditableValue, type Field,
} from '../upload-service/lib/invitation-draft.mjs';

const apiBase = (import.meta.env.VITE_UPLOAD_API_URL || '').replace(/\/$/, '');
type Props = { templateId: string; lang: Language; setLang: (lang: Language) => void };
type Change = (value: EditableValue) => void;

function Fields({ fields, value, onChange }: { fields: Field[]; value: Draft; onChange: Change }) {
  return <div className="grid gap-4">{fields.map(field => (
    <FieldEditor key={field.key} field={field} value={value[field.key]} onChange={next => onChange({ ...value, [field.key]: next })} />
  ))}</div>;
}

const inputStyle = 'block w-full mt-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm';

function FieldEditor({ field, value, onChange }: { field: Field; value: EditableValue; onChange: Change }) {
  if (field.kind === 'group') return (
    <fieldset className="rounded-lg border border-stone-200 p-3">
      <legend className="px-1 font-medium text-sm">{field.label}</legend>
      <Fields fields={field.fields ?? []} value={value as Draft} onChange={onChange} />
    </fieldset>
  );

  if (field.kind === 'list') {
    const entries = value as EditableValue[];
    return (
      <fieldset className="rounded-lg border border-stone-200 p-3">
        <legend className="px-1 text-sm font-medium">{field.label}</legend>
        {entries.map((entry, index) => {
          const update = (next: EditableValue) => onChange(entries.map((row, i) => i === index ? next : row));
          return <div className="border-b border-stone-200 pb-3 mb-3" key={index}>
            <p className="text-xs text-stone-500 mb-2">Entry {index + 1}</p>
            {field.item
              ? <FieldEditor field={field.item} value={entry} onChange={update} />
              : <Fields fields={field.fields ?? []} value={entry as Draft} onChange={update} />}
            <button type="button" className="mt-2 text-xs text-rose-800 underline" onClick={() => onChange(entries.filter((_, i) => i !== index))}>Remove entry {index + 1}</button>
          </div>;
        })}
        <button type="button" disabled={entries.length >= (field.max ?? 20)} className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm disabled:opacity-40" onClick={() => {
          const entry = field.item ? initialValue(field.item, field.item.kind === 'color' ? '#7A8154' : undefined)
            : Object.fromEntries((field.fields ?? []).map(child => [child.key, initialValue(child)]));
          onChange([...entries, entry]);
        }}>Add entry</button>
      </fieldset>
    );
  }

  if (field.kind === 'toggle') return <label className="flex gap-2 items-center text-sm">
    <input type="checkbox" checked={value === true} onChange={event => onChange(event.target.checked)} /> {field.label}
  </label>;

  const string = typeof value === 'string' ? value : '';
  const title = field.label + (field.required ? ' *' : '');
  if (field.kind === 'color') return <div>
    <span className="text-sm font-medium">{title}</span>
    <div className="flex items-center gap-2 mt-1">
      <input type="color" aria-label={field.label + ' color picker'} value={/^#[\da-f]{6}$/i.test(string) ? string : '#7A8154'} onChange={event => onChange(event.target.value)} />
      <input className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm w-28" aria-label={field.label + ' hex color'} placeholder="#7A8154" value={string} maxLength={7} onChange={event => onChange(event.target.value)} />
      {!field.required && <button type="button" className="text-xs underline" onClick={() => onChange('')}>Use default</button>}
    </div>
  </div>;

  return <label className="block text-sm font-medium">
    {title}
    {field.kind === 'select'
      ? <select className={inputStyle} value={string} onChange={event => onChange(event.target.value)}>
          {!field.required && <option value="">Template default</option>}
          {field.options?.map(option => <option key={option} value={option}>{option.replace(/"/g, '')}</option>)}
        </select>
      : field.kind === 'textarea'
        ? <textarea rows={3} className={inputStyle} maxLength={field.max} value={string} onChange={event => onChange(event.target.value)} />
        : <input type={['date', 'time', 'url'].includes(field.kind) ? field.kind : field.kind === 'map' ? 'url' : 'text'} className={inputStyle} maxLength={field.max} value={string} onChange={event => onChange(event.target.value)} />}
  </label>;
}

function Preview({ data, language }: { data: WeddingData | null; language: Language }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState<'mobile' | 'wide'>('mobile');
  const [frameKey, setFrameKey] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'amore:preview-ready') setReady(true);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (ready && data) frame.current?.contentWindow?.postMessage({ type: 'amore:invitation-preview', data, language }, window.location.origin);
  }, [data, language, ready]);

  return <aside id="invitation-preview" className="min-w-0 lg:sticky lg:top-5 self-start">
    <div className="flex flex-wrap gap-2 justify-between items-center mb-3">
      <h2 className="text-xl font-serif">Live preview</h2>
      <div className="flex gap-3 text-xs">
        <button type="button" aria-pressed={width === 'mobile'} className={width === 'mobile' ? 'underline font-bold' : ''} onClick={() => setWidth('mobile')}>Phone</button>
        <button type="button" aria-pressed={width === 'wide'} className={width === 'wide' ? 'underline font-bold' : ''} onClick={() => setWidth('wide')}>Wide</button>
        <button type="button" onClick={() => { setReady(false); setFrameKey(value => value + 1); }}>Replay envelope</button>
      </div>
    </div>
    {!data && <p className="text-sm mb-3 text-stone-600">Complete the required fields and correct invalid values to update the preview.</p>}
    <div className="bg-stone-200 rounded-2xl p-2 flex justify-center">
      <iframe key={frameKey} title="Live wedding invitation preview" src="?mode=preview" className={'bg-white rounded-xl w-full h-[640px] ' + (width === 'mobile' ? 'max-w-[390px]' : '')} onLoad={() => {
        if (data) frame.current?.contentWindow?.postMessage({ type: 'amore:invitation-preview', data, language }, window.location.origin);
      }} ref={frame} />
    </div>
    <p className="mt-3 text-xs text-stone-600">Preview only. RSVP submissions are disabled here.</p>
  </aside>;
}

export default function CustomizeForm({ templateId, lang, setLang }: Props) {
  const [seed, setSeed] = useState<WeddingData | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slug, setSlug] = useState('');
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'done' | 'failed'>('loading');
  const [errors, setErrors] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!templateIds.includes(templateId)) { setStatus('failed'); return; }
    const controller = new AbortController();
    fetch(`./templates/${templateId}.json`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Template unavailable');
      return response.json() as Promise<WeddingData>;
    }).then(data => {
      setSeed(data);
      setDraft(createDraft(data));
      setStatus('idle');
    }).catch(() => { if (!controller.signal.aborted) setStatus('failed'); });
    return () => controller.abort();
  }, [templateId]);

  const preview = useMemo(() => {
    if (!seed || !draft) return null;
    const result = validateSubmission({ templateId, slug: 'sample.couple', publishConsent: true, customization: draft });
    if (!result.value) return null;
    const data = buildInvitation(seed, result.value.customization);
    const hidePlaceholders = (url: string) => url.includes('[event-folder]') ? '' : url;
    return {
      ...data,
      images: { ...data.images, hero: hidePlaceholders(data.images.hero), groom: hidePlaceholders(data.images.groom), bride: hidePlaceholders(data.images.bride) },
      gallery: data.gallery.filter(url => !url.includes('[event-folder]')),
    };
  }, [draft, seed, templateId]);

  useEffect(() => { if (errors.length) errorRef.current?.focus(); }, [errors]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || status === 'done') return;
    const payload = { templateId, slug: slug.trim(), publishConsent: consent, customization: draft, hp };
    const result = validateSubmission(payload);
    if (!result.value) { setErrors(result.errors); return; }
    if (!apiBase) { setErrors(['Submission is unavailable. Contact the studio to review this draft.']); return; }
    setErrors([]);
    busy.current = true;
    setStatus('sending');
    try {
      const response = await fetch(`${apiBase}/api/create-invitation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) {
        setErrors(Array.isArray(data.errors) && data.errors.length ? data.errors : [data.error || 'The invitation could not be submitted.']);
        setStatus('idle');
        return;
      }
      setStatus('done');
    } catch {
      setErrors(['The submission could not be confirmed. Try again using the same link ID and details.']);
      setStatus('idle');
    } finally {
      busy.current = false;
    }
  }

  const templateName = templateId === 'ivory_olive' ? 'Ivory & Olive' : 'Starry Night';
  return <div className="min-h-screen bg-[#F5F0E6] text-[#393632]">
    <header className="bg-white px-5 py-4 border-b border-stone-200">
      <a href="?mode=catalog" className="text-sm underline">← Back to templates</a>
      <h1 className="font-serif text-3xl mt-2">Customize your invitation</h1>
      <p className="text-sm text-stone-600 mt-1">{templateName}</p>
      <a href="#invitation-preview" className="text-sm underline lg:hidden">Jump to preview</a>
      <LanguageSwitch current={lang} onChange={setLang} />
    </header>
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {status === 'loading' && <p role="status">Loading template…</p>}
      {status === 'failed' && <p role="alert">This template is unavailable. <a className="underline" href="?mode=catalog">Choose a template</a>.</p>}
      {status === 'done' && <div role="status" className="rounded-xl bg-white p-6">
        <h2 className="text-2xl font-serif">Invitation sent for review</h2>
        <p className="mt-2">Reference: <strong>{slug.trim()}</strong>. Your invitation goes live after the studio reviews and publishes it.</p>
      </div>}
      {draft && status !== 'done' && <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form noValidate onSubmit={submit} className="min-w-0 space-y-4">
          <p className="text-sm">Edit the text, photos, colors, and sections below. The language switch controls the preview. Use the English, Japanese, and Burmese fields to enter translations.</p>
          <fieldset disabled={status === 'sending'} className="space-y-4">
            {sections.map((section, index) => <details key={section.title} open={index === 0 ? true : undefined} className="bg-white rounded-xl border border-stone-200">
              <summary className="cursor-pointer px-4 py-3 font-semibold">{section.title}</summary>
              <div className="px-4 pb-4">
                {section.title === 'Photos & music' && <p className="text-sm text-stone-600 mb-3">Paste direct HTTPS media links. Leave a photo blank to use the template’s default or upload it through the studio after review.</p>}
                <Fields fields={section.fields} value={draft} onChange={next => setDraft(next as Draft)} />
              </div>
            </details>)}
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <label className="block text-sm font-medium">Invitation link ID *
                <input className={inputStyle} placeholder="groom.bride" value={slug} maxLength={41} autoCapitalize="none" autoComplete="off" onChange={event => setSlug(event.target.value)} />
              </label>
              <label className="flex items-start gap-2 text-sm mt-4">
                <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" />
                <span>I understand the submitted invitation text and media links will be visible in a public GitHub pull request before the invitation goes live. I have permission to share them.</span>
              </label>
              <div hidden aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={hp} onChange={event => setHp(event.target.value)} /></div>
              {errors.length > 0 && <div role="alert" tabIndex={-1} ref={errorRef} className="my-4 rounded-lg bg-rose-50 text-rose-900 p-3 text-sm">
                <strong>Check the draft</strong><ul className="list-disc pl-5 mt-1">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
              </div>}
              <button className="mt-4 rounded-lg bg-[#565B41] px-5 py-3 text-white disabled:opacity-50" disabled={status === 'sending'}>{status === 'sending' ? 'Submitting…' : 'Submit for studio review'}</button>
            </div>
          </fieldset>
        </form>
        <Preview data={preview} language={lang} />
      </div>}
    </main>
  </div>;
}
