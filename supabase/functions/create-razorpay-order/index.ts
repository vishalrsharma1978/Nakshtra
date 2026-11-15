// Creates a Razorpay order for either a question fast-track upgrade or a consultation.
// Amount is always computed server-side from app settings / consultation record.
// Env required: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const keyId = Deno.env.get('RAZORPAY_KEY_ID');
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
  if (!keyId || !keySecret) return json({ error: 'Payment gateway not configured' }, 500);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Identify the calling user from their JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  let input: { purpose?: string; ref_id?: string };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { purpose, ref_id } = input;
  if (!ref_id || (purpose !== 'question_fast_track' && purpose !== 'consultation')) {
    return json({ error: 'purpose must be question_fast_track|consultation with a ref_id' }, 400);
  }

  // Compute amount server-side
  let amountInr = 0;
  if (purpose === 'question_fast_track') {
    const { data: q } = await supabaseAdmin
      .from('questions').select('id, user_id, tier').eq('id', ref_id).single();
    if (!q || q.user_id !== userId) return json({ error: 'Question not found' }, 404);
    if (q.tier === 'paid') return json({ error: 'Question already fast-tracked' }, 400);
    const { data: s } = await supabaseAdmin
      .from('app_settings').select('value').eq('key', 'fast_track_price_inr').single();
    amountInr = Number(s?.value ?? 199);
  } else {
    const { data: c } = await supabaseAdmin
      .from('consultations').select('id, user_id, amount_inr, status').eq('id', ref_id).single();
    if (!c || c.user_id !== userId) return json({ error: 'Consultation not found' }, 404);
    if (c.status !== 'pending_payment') return json({ error: 'Consultation is not awaiting payment' }, 400);
    amountInr = c.amount_inr;
  }
  if (!amountInr || amountInr <= 0) return json({ error: 'Invalid amount' }, 400);

  // Create Razorpay order
  const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountInr * 100, // paise
      currency: 'INR',
      notes: { purpose, ref_id, user_id: userId },
    }),
  });
  if (!orderRes.ok) {
    console.error('Razorpay order failed', await orderRes.text());
    return json({ error: 'Failed to create payment order' }, 502);
  }
  const order = await orderRes.json();

  const { error: payErr } = await supabaseAdmin.from('payments').insert({
    user_id: userId,
    purpose,
    ref_id,
    amount_inr: amountInr,
    razorpay_order_id: order.id,
    status: 'created',
  });
  if (payErr) {
    console.error('payments insert failed', payErr);
    return json({ error: 'Failed to record payment' }, 500);
  }

  return json({
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: keyId,
  });
});
