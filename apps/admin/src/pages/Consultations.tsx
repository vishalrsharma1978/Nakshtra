import { useCallback, useEffect, useState } from 'react';
import { JITSI_BASE_URL, type Consultation, type ConsultStatus } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

type ConsultRow = Consultation & {
  profiles: { email: string | null; full_name: string | null } | null;
  experts: { display_name: string } | null;
};

const STATUSES: ConsultStatus[] = ['pending_payment', 'booked', 'completed', 'cancelled'];

export default function Consultations() {
  const [rows, setRows] = useState<ConsultRow[]>([]);
  const [filter, setFilter] = useState<ConsultStatus | 'all'>('booked');

  const load = useCallback(async () => {
    let q = supabase
      .from('consultations')
      .select('*, profiles!consultations_user_id_fkey(email, full_name), experts(display_name)')
      .order('scheduled_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setRows((data ?? []) as ConsultRow[]);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: ConsultStatus) => {
    await supabase.from('consultations').update({ status }).eq('id', id);
    await load();
  };

  return (
    <div>
      <h2>Consultations</h2>
      <div className="toolbar">
        {(['all', ...STATUSES] as const).map((f) => (
          <button key={f} className={`btn-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>User</th><th>Expert</th><th>Scheduled</th><th>Duration</th><th>Amount</th><th>Status</th><th>Room</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.profiles?.full_name || c.profiles?.email || '—'}</td>
              <td>{c.experts?.display_name ?? '—'}</td>
              <td>{new Date(c.scheduled_at).toLocaleString()}</td>
              <td>{c.duration_min} min</td>
              <td>₹{c.amount_inr}</td>
              <td>
                <select value={c.status} onChange={(e) => void setStatus(c.id, e.target.value as ConsultStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </td>
              <td>
                {c.status === 'booked' ? (
                  <a href={`${JITSI_BASE_URL}/nakshtra-${c.jitsi_room}`} target="_blank" rel="noreferrer">
                    Join as host
                  </a>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">No consultations.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
