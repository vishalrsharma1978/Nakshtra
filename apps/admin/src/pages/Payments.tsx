import { useEffect, useState } from 'react';
import type { Payment } from '@nakshtra/shared';
import { supabase } from '../lib/supabase';

type PaymentRow = Payment & { profiles: { email: string | null } | null };

export default function Payments() {
  const [rows, setRows] = useState<PaymentRow[]>([]);

  useEffect(() => {
    void supabase
      .from('payments')
      .select('*, profiles!payments_user_id_fkey(email)')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setRows((data ?? []) as PaymentRow[]));
  }, []);

  return (
    <div>
      <h2>Payments</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th><th>User</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Razorpay order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.created_at).toLocaleString()}</td>
              <td>{p.profiles?.email ?? '—'}</td>
              <td>{p.purpose.replace(/_/g, ' ')}</td>
              <td>₹{p.amount_inr}</td>
              <td><span className={`badge badge-pay-${p.status}`}>{p.status}</span></td>
              <td className="mono">{p.razorpay_order_id ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">No payments yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
