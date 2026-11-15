import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Stats {
  users: number;
  openQuestions: number;
  slaBreaches: number;
  bookedConsults: number;
  revenueInr: number;
  paidQuestions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void (async () => {
      const nowIso = new Date().toISOString();
      const [users, openQ, breaches, consults, payments, paidQ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }).in('status', ['open', 'assigned']),
        supabase
          .from('questions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'assigned'])
          .lt('sla_due_at', nowIso),
        supabase.from('consultations').select('id', { count: 'exact', head: true }).eq('status', 'booked'),
        supabase.from('payments').select('amount_inr').eq('status', 'paid'),
        supabase.from('questions').select('id', { count: 'exact', head: true }).eq('tier', 'paid'),
      ]);
      setStats({
        users: users.count ?? 0,
        openQuestions: openQ.count ?? 0,
        slaBreaches: breaches.count ?? 0,
        bookedConsults: consults.count ?? 0,
        revenueInr: (payments.data ?? []).reduce((sum, p) => sum + (p.amount_inr ?? 0), 0),
        paidQuestions: paidQ.count ?? 0,
      });
    })();
  }, []);

  if (!stats) return <p className="muted">Loading…</p>;

  const cards = [
    { label: 'Registered users', value: stats.users, icon: '👥' },
    { label: 'Open questions', value: stats.openQuestions, icon: '💬' },
    { label: 'SLA breaches (live)', value: stats.slaBreaches, icon: '🚨', danger: stats.slaBreaches > 0 },
    { label: 'Booked consultations', value: stats.bookedConsults, icon: '📹' },
    { label: 'Fast-track questions', value: stats.paidQuestions, icon: '⚡' },
    { label: 'Revenue (paid)', value: `₹${stats.revenueInr.toLocaleString('en-IN')}`, icon: '💰' },
  ];

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stat-grid">
        {cards.map((c) => (
          <div key={c.label} className={`stat-card ${c.danger ? 'stat-danger' : ''}`}>
            <span className="stat-icon">{c.icon}</span>
            <span className="stat-value">{c.value}</span>
            <span className="stat-label">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
