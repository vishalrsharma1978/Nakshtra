import { useCallback, useEffect, useState } from 'react';
import { ZODIAC_SIGNS, type Horoscope, type Language } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

export default function Horoscopes() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [language, setLanguage] = useState<Language>('en');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedSign, setSavedSign] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('horoscopes')
      .select('*')
      .eq('for_date', date)
      .eq('language', language);
    const next: Record<string, string> = {};
    for (const h of (data ?? []) as Horoscope[]) next[h.sign] = h.content;
    setDrafts(next);
  }, [date, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (sign: string) => {
    const content = (drafts[sign] ?? '').trim();
    if (!content) return;
    await supabase
      .from('horoscopes')
      .upsert({ sign, for_date: date, language, content }, { onConflict: 'sign,for_date,language' });
    setSavedSign(sign);
    setTimeout(() => setSavedSign(null), 2000);
  };

  return (
    <div>
      <h2>Daily horoscopes</h2>
      <div className="toolbar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
        </select>
      </div>
      <div className="horoscope-grid">
        {ZODIAC_SIGNS.map((s) => (
          <div key={s.key} className="form-card">
            <h3>
              {s.symbol} {language === 'hi' ? s.hi : s.en}
            </h3>
            <textarea
              rows={3}
              value={drafts[s.key] ?? ''}
              placeholder={`Horoscope for ${s.en} on ${date}…`}
              onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
            />
            <button className="btn btn-sm" onClick={() => void save(s.key)} disabled={!(drafts[s.key] ?? '').trim()}>
              {savedSign === s.key ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
