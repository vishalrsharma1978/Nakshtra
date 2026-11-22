// Registers a new user WITHOUT sending a confirmation email or SMS, so sign-up never
// hits Supabase's built-in email limit (about 2 emails/hour) and works for any valid
// email address or phone number. The account is created already-confirmed through the
// Auth admin API; the app then signs the user in with the same credentials.
//
// Env (set automatically on Supabase Edge Functions):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// The service-role key stays on the server and is never sent to the app.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E.164 check: + followed by 10-15 digits. */
const PHONE_RE = /^\+[1-9]\d{9,14}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: {
    email?: string;
    phone?: string;
    password?: string;
    full_name?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const password = body.password ?? "";
  const fullName = (body.full_name ?? "").trim().slice(0, 120);

  if (!email && !phone)
    return json({ error: "Please enter an email or a phone number." }, 400);
  if (email && !EMAIL_RE.test(email))
    return json({ error: "Please enter a valid email address." }, 400);
  if (phone && !PHONE_RE.test(phone))
    return json(
      { error: "Please enter a valid phone number with country code." },
      400,
    );
  if (password.length < 6)
    return json(
      {
        error: "Your password is too short. Please use at least 6 characters.",
      },
      400,
    );

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey)
    return json(
      { error: "Registration is not configured on the server." },
      500,
    );

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    ...(email ? { email, email_confirm: true } : {}),
    ...(phone ? { phone, phone_confirm: true } : {}),
    password,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (
      m.includes("already") ||
      m.includes("registered") ||
      m.includes("exists")
    )
      return json(
        { error: "This account already exists. Please sign in instead." },
        409,
      );
    return json({ error: error.message }, 400);
  }

  return json({ ok: true, id: data.user?.id });
});
