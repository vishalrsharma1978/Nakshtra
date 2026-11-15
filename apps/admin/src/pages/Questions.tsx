import { useCallback, useEffect, useState } from 'react';
import { isSlaBreached, slaRemainingLabel, type Expert, type Question, type QuestionMessage } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../auth';

type QuestionRow = Question & { profiles: { email: string | null; full_name: string | null } | null };

export default function Questions() {
  const { session } = useAdminAuth();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [filter, setFilter] = useState<'active' | 'breached' | 'answered' | 'all'>('active');
  const [selected, setSelected] = useState<QuestionRow | null>(null);
  const [messages, setMessages] = useState<QuestionMessage[]>([]);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    let q = supabase
      .from('questions')
      .select('*, profiles!questions_user_id_fkey(email, full_name)')
      .order('sla_due_at', { ascending: true });
    if (filter === 'active') q = q.in('status', ['open', 'assigned']);
    if (filter === 'breached') q = q.in('status', ['open', 'assigned']).lt('sla_due_at', new Date().toISOString());
    if (filter === 'answered') q = q.in('status', ['answered', 'closed']);
    const { data } = await q;
    setQuestions((data ?? []) as QuestionRow[]);
  }, [filter]);

  useEffect(() => {
    void load();
    void supabase.from('experts').select('*').then(({ data }) => setExperts((data ?? []) as Expert[]));
  }, [load]);

  const openThread = async (q: QuestionRow) => {
    setSelected(q);
    const { data } = await supabase
      .from('question_messages')
      .select('*')
      .eq('question_id', q.id)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as QuestionMessage[]);
  };

  const assign = async (questionId: string, expertId: string) => {
    await supabase
      .from('questions')
      .update({ assigned_expert_id: expertId || null, status: expertId ? 'assigned' : 'open' })
      .eq('id', questionId);
    await load();
  };

  const sendReply = async () => {
    if (!selected || !session || !reply.trim()) return;
    // Trigger marks the question answered because sender role is expert/admin
    await supabase
      .from('question_messages')
      .insert({ question_id: selected.id, sender_id: session.user.id, body: reply.trim() });
    setReply('');
    await openThread(selected);
    await load();
  };

  const closeQuestion = async (questionId: string) => {
    await supabase.from('questions').update({ status: 'closed' }).eq('id', questionId);
    setSelected(null);
    await load();
  };

  return (
    <div>
      <h2>Questions & SLA queue</h2>
      <div className="toolbar">
        {(['active', 'breached', 'answered', 'all'] as const).map((f) => (
          <button key={f} className={`btn-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>User</th>
            <th>Tier</th>
            <th>Status</th>
            <th>SLA</th>
            <th>Assigned expert</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const breached = isSlaBreached(q);
            return (
              <tr key={q.id} className={breached && (q.status === 'open' || q.status === 'assigned') ? 'row-danger' : ''}>
                <td>{q.title}</td>
                <td>{q.profiles?.full_name || q.profiles?.email || '—'}</td>
                <td>{q.tier === 'paid' ? '⚡ paid' : 'free'}</td>
                <td><span className={`badge badge-${q.status}`}>{q.status}</span></td>
                <td>{q.status === 'open' || q.status === 'assigned' ? slaRemainingLabel(q.sla_due_at) : '—'}</td>
                <td>
                  <select value={q.assigned_expert_id ?? ''} onChange={(e) => void assign(q.id, e.target.value)}>
                    <option value="">Unassigned</option>
                    {experts.map((ex) => (
                      <option key={ex.id} value={ex.id}>{ex.display_name}</option>
                    ))}
                  </select>
                </td>
                <td><button className="btn btn-sm" onClick={() => void openThread(q)}>Open</button></td>
              </tr>
            );
          })}
          {questions.length === 0 && (
            <tr><td colSpan={7} className="muted">No questions in this view.</td></tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{selected.title}</h3>
            <p className="muted">
              {selected.category} · {selected.tier} · from {selected.profiles?.email}
            </p>
            <div className="thread">
              <div className="msg msg-user">{selected.body}</div>
              {messages.map((m) => (
                <div key={m.id} className={m.sender_id === selected.user_id ? 'msg msg-user' : 'msg msg-expert'}>
                  {m.body}
                  <span className="msg-time">{new Date(m.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write an expert reply (marks the question answered)…"
              rows={3}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => void sendReply()} disabled={!reply.trim()}>Send reply</button>
              <button className="btn btn-outline" onClick={() => void closeQuestion(selected.id)}>Close question</button>
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
