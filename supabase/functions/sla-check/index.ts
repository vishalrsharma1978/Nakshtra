// SLA check: finds open/assigned questions past their SLA due time and logs
// escalations so admins can act. Intended to run on a cron schedule via
// Supabase scheduled functions or pg_cron + pg_net.
// Env required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SLA_CHECK_SECRET

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // Simple shared-secret guard so only the scheduler can trigger escalation
  const secret = Deno.env.get('SLA_CHECK_SECRET');
  if (secret && req.headers.get('x-sla-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: overdue, error } = await supabaseAdmin
    .from('questions')
    .select('id, user_id, title, tier, sla_due_at, assigned_expert_id')
    .in('status', ['open', 'assigned'])
    .lt('sla_due_at', new Date().toISOString());

  if (error) {
    console.error('sla query failed', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  for (const q of overdue ?? []) {
    await supabaseAdmin.from('activity_log').insert({
      user_id: q.user_id,
      action: 'sla_breach',
      metadata: {
        question_id: q.id,
        title: q.title,
        tier: q.tier,
        sla_due_at: q.sla_due_at,
        assigned_expert_id: q.assigned_expert_id,
      },
    });
  }

  return new Response(
    JSON.stringify({ checked_at: new Date().toISOString(), breaches: overdue?.length ?? 0 }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
