-- Hardening: trigger functions must not be callable via the REST RPC surface.
-- (Postgres only checks EXECUTE on trigger functions at trigger-creation time,
-- so revoking does not affect the triggers themselves.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_expert_reply() from public, anon, authenticated;

-- Note: current_role()/is_admin()/is_expert() stay executable because RLS
-- policies evaluate them as the querying role; they only return the caller's
-- own role and leak nothing else.
