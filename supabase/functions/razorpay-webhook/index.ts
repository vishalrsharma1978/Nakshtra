// Razorpay webhook: verifies HMAC signature, marks payment paid and fulfils the purchase
// (upgrades question to fast-track SLA, or confirms a consultation booking).
// Env required: RAZORPAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy with --no-verify-jwt (Razorpay cannot send a Supabase JWT).

import { createClient } from 'jsr:@supabase/supabase-js@2';

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  if (!webhookSecret) return new Response('Webhook not configured', { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = await hmacSha256Hex(webhookSecret, rawBody);
  if (!timingSafeEqual(signature, expected)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);
  if (event.event !== 'payment.captured' && event.event !== 'payment.failed') {
    return new Response('ignored', { status: 200 });
  }

  const payment = event.payload?.payment?.entity;
  const orderId: string | undefined = payment?.order_id;
  if (!orderId) return new Response('no order id', { status: 200 });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: payRow } = await supabaseAdmin
    .from('payments').select('*').eq('razorpay_order_id', orderId).single();
  if (!payRow) return new Response('payment row not found', { status: 200 });
  if (payRow.status === 'paid') return new Response('already processed', { status: 200 });

  if (event.event === 'payment.failed') {
    await supabaseAdmin.from('payments')
      .update({ status: 'failed', razorpay_payment_id: payment.id, updated_at: new Date().toISOString() })
      .eq('id', payRow.id);
    return new Response('ok', { status: 200 });
  }

  // payment.captured — mark paid and fulfil
  await supabaseAdmin.from('payments')
    .update({ status: 'paid', razorpay_payment_id: payment.id, updated_at: new Date().toISOString() })
    .eq('id', payRow.id);

  if (payRow.purpose === 'question_fast_track') {
    const { data: s } = await supabaseAdmin
      .from('app_settings').select('value').eq('key', 'paid_sla_hours').single();
    const paidSlaHours = Number(s?.value ?? 4);
    // Fast-track SLA counts from the moment of payment
    const due = new Date(Date.now() + paidSlaHours * 3_600_000).toISOString();
    await supabaseAdmin.from('questions')
      .update({ tier: 'paid', sla_due_at: due })
      .eq('id', payRow.ref_id)
      .in('status', ['open', 'assigned']);
  } else if (payRow.purpose === 'consultation') {
    await supabaseAdmin.from('consultations')
      .update({ status: 'booked', payment_id: payRow.id })
      .eq('id', payRow.ref_id);
  }

  await supabaseAdmin.from('activity_log').insert({
    user_id: payRow.user_id,
    action: 'payment_captured',
    metadata: { purpose: payRow.purpose, ref_id: payRow.ref_id, amount_inr: payRow.amount_inr },
  });

  return new Response('ok', { status: 200 });
});
