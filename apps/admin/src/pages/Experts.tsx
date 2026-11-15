import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Expert } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

const EMPTY = {
  display_name: '',
  bio: '',
  photo_url: '',
  specialties: '',
  languages: 'en,hi',
  experience_years: 0,
  consult_rate_inr: 499,
  is_active: true,
};

export default function Experts() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('experts').select('*').order('created_at', { ascending: false });
    setExperts((data ?? []) as Expert[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toCsvArray = (s: string) =>
    s.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      display_name: form.display_name.trim(),
      bio: form.bio.trim() || null,
      photo_url: form.photo_url.trim() || null,
      specialties: toCsvArray(form.specialties),
      languages: toCsvArray(form.languages),
      experience_years: Number(form.experience_years) || 0,
      consult_rate_inr: Number(form.consult_rate_inr) || 0,
      is_active: form.is_active,
    };
    if (!payload.display_name) {
      setError('Display name is required');
      return;
    }
    if (payload.consult_rate_inr <= 0) {
      setError('Consultation rate must be a positive amount');
      return;
    }
    const { error: err } = editingId
      ? await supabase.from('experts').update(payload).eq('id', editingId)
      : await supabase.from('experts').insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm({ ...EMPTY });
    setEditingId(null);
    await load();
  };

  const edit = (ex: Expert) => {
    setEditingId(ex.id);
    setForm({
      display_name: ex.display_name,
      bio: ex.bio ?? '',
      photo_url: ex.photo_url ?? '',
      specialties: ex.specialties.join(', '),
      languages: ex.languages.join(', '),
      experience_years: ex.experience_years,
      consult_rate_inr: ex.consult_rate_inr,
      is_active: ex.is_active,
    });
  };

  const toggleActive = async (ex: Expert) => {
    await supabase.from('experts').update({ is_active: !ex.is_active }).eq('id', ex.id);
    await load();
  };

  return (
    <div>
      <h2>Consultants</h2>
      <form className="form-card" onSubmit={submit}>
        <h3>{editingId ? 'Edit consultant' : 'Add consultant'}</h3>
        <div className="form-grid">
          <label>
            Display name
            <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
          </label>
          <label>
            Photo URL
            <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
          </label>
          <label>
            Specialties (comma separated)
            <input
              value={form.specialties}
              placeholder="career, love, health"
              onChange={(e) => setForm({ ...form, specialties: e.target.value })}
            />
          </label>
          <label>
            Languages (comma separated)
            <input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
          </label>
          <label>
            Experience (years)
            <input
              type="number"
              min={0}
              value={form.experience_years}
              onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
            />
          </label>
          <label>
            Consultation rate (₹)
            <input
              type="number"
              min={1}
              value={form.consult_rate_inr}
              onChange={(e) => setForm({ ...form, consult_rate_inr: Number(e.target.value) })}
            />
          </label>
        </div>
        <label>
          Bio
          <textarea value={form.bio} rows={2} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (visible to users)
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button className="btn" type="submit">{editingId ? 'Save changes' : 'Add consultant'}</button>
          {editingId && (
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({ ...EMPTY });
              }}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Specialties</th><th>Experience</th><th>Rate</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {experts.map((ex) => (
            <tr key={ex.id}>
              <td>{ex.display_name}</td>
              <td>{ex.specialties.join(', ')}</td>
              <td>{ex.experience_years} yrs</td>
              <td>₹{ex.consult_rate_inr}</td>
              <td>
                <span className={`badge ${ex.is_active ? 'badge-answered' : 'badge-closed'}`}>
                  {ex.is_active ? 'active' : 'inactive'}
                </span>
              </td>
              <td>
                <button className="btn btn-sm" onClick={() => edit(ex)}>Edit</button>{' '}
                <button className="btn btn-sm btn-outline" onClick={() => void toggleActive(ex)}>
                  {ex.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
