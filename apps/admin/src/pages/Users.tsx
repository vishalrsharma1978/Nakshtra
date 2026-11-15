import { useCallback, useEffect, useState } from 'react';
import type { Profile, UserRole } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

interface ActivityRow {
  id: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);

  const load = useCallback(async () => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
    if (search.trim()) q = q.or(`email.ilike.%${search.trim()}%,full_name.ilike.%${search.trim()}%`);
    const { data } = await q;
    setUsers((data ?? []) as Profile[]);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openActivity = async (u: Profile) => {
    setSelected(u);
    const { data } = await supabase
      .from('activity_log')
      .select('id, action, metadata, created_at')
      .eq('user_id', u.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setActivity((data ?? []) as ActivityRow[]);
  };

  const setRole = async (u: Profile, role: UserRole) => {
    await supabase.from('profiles').update({ role }).eq('id', u.id);
    await load();
  };

  return (
    <div>
      <h2>Users</h2>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th><th>Email</th><th>Role</th><th>Language</th><th>Joined</th><th>Last seen</th><th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name || '—'}</td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} onChange={(e) => void setRole(u, e.target.value as UserRole)}>
                  <option value="user">user</option>
                  <option value="expert">expert</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td>{u.language}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
              <td>{u.last_seen_at ? new Date(u.last_seen_at).toLocaleString() : '—'}</td>
              <td><button className="btn btn-sm" onClick={() => void openActivity(u)}>Activity</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Activity — {selected.email}</h3>
            {activity.length === 0 && <p className="muted">No tracked activity.</p>}
            <ul className="activity-list">
              {activity.map((a) => (
                <li key={a.id}>
                  <strong>{a.action}</strong>
                  <span className="muted"> · {new Date(a.created_at).toLocaleString()}</span>
                  <pre>{JSON.stringify(a.metadata, null, 1)}</pre>
                </li>
              ))}
            </ul>
            <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
