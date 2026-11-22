-- Allow registration with a phone number as well as an email.
-- The signup trigger now copies the phone (when present) into the profile, and
-- tolerates a missing email so phone-only accounts get a profile row too.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    nullif(new.email, ''),
    nullif(new.phone, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Keep trigger functions off the REST RPC surface (same hardening as 0003).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
