import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsForm {
  free_sla_hours: number;
  paid_sla_hours: number;
  fast_track_price_inr: number;
  default_consult_rate_inr: number;
  default_consult_duration_min: number;
  razorpay_key_id: string;
  forum_enabled: boolean;
  consult_enabled: boolean;
}

const DEFAULTS: SettingsForm = {
  free_sla_hours: 48,
  paid_sla_hours: 4,
  fast_track_price_inr: 199,
  default_consult_rate_inr: 499,
  default_consult_duration_min: 30,
  razorpay_key_id: '',
  forum_enabled: true,
  consult_enabled: true,
};

export default function Settings() {
  const [form, setForm] = useState<SettingsForm>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.from('app_settings').select('key, value').then(({ data }) => {
      if (!data) return;
      const merged: Record<string, unknown> = { ...DEFAULTS };
      for (const row of data) merged[row.key] = row.value;
      setForm(merged as unknown as SettingsForm);
    });
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const entries = Object.entries(form).map(([key, value]) => ({
      key,
      value: value as never,
      updated_at: new Date().toISOString(),
    }));
    const { error: err } = await supabase.from('app_settings').upsert(entries);
    if (err) setError(err.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return (
    <div>
      <h2>Settings</h2>
      <form className="form-card" onSubmit={save}>
        <h3>SLA configuration</h3>
        <div className="form-grid">
          <label>
            Free tier SLA (hours)
            <input type="number" min={1} value={form.free_sla_hours}
              onChange={(e) => setForm({ ...form, free_sla_hours: num(e.target.value) })} />
          </label>
          <label>
            Fast-track SLA (hours)
            <input type="number" min={1} value={form.paid_sla_hours}
              onChange={(e) => setForm({ ...form, paid_sla_hours: num(e.target.value) })} />
          </label>
        </div>

        <h3>Pricing</h3>
        <div className="form-grid">
          <label>
            Fast-track price (₹)
            <input type="number" min={1} value={form.fast_track_price_inr}
              onChange={(e) => setForm({ ...form, fast_track_price_inr: num(e.target.value) })} />
          </label>
          <label>
            Default consultation rate (₹)
            <input type="number" min={1} value={form.default_consult_rate_inr}
              onChange={(e) => setForm({ ...form, default_consult_rate_inr: num(e.target.value) })} />
          </label>
          <label>
            Consultation duration (min)
            <input type="number" min={10} value={form.default_consult_duration_min}
              onChange={(e) => setForm({ ...form, default_consult_duration_min: num(e.target.value) })} />
          </label>
        </div>

        <h3>Payment gateway</h3>
        <div className="form-grid">
          <label>
            Razorpay Key ID (public)
            <input value={form.razorpay_key_id} placeholder="rzp_live_…"
              onChange={(e) => setForm({ ...form, razorpay_key_id: e.target.value })} />
          </label>
        </div>
        <p className="muted">
          The Razorpay <strong>key secret</strong> and <strong>webhook secret</strong> are never stored here — set them
          as Supabase Edge Function secrets (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET).
        </p>

        <h3>Feature toggles</h3>
        <label className="checkbox">
          <input type="checkbox" checked={form.forum_enabled}
            onChange={(e) => setForm({ ...form, forum_enabled: e.target.checked })} />
          Expert Q&A forum enabled
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={form.consult_enabled}
            onChange={(e) => setForm({ ...form, consult_enabled: e.target.checked })} />
          Video consultations enabled
        </label>

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Saved ✓</p>}
        <button className="btn" type="submit">Save settings</button>
      </form>
    </div>
  );
}
