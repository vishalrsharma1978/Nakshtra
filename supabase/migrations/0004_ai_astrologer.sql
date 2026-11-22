-- AI astrologer chatbot: per-user chat history.

create table public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  suggest_expert boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_chat_messages_user_idx on public.ai_chat_messages (user_id, created_at);

alter table public.ai_chat_messages enable row level security;

create policy "users read own ai chat" on public.ai_chat_messages
  for select using (user_id = auth.uid() or public.is_admin());
create policy "users delete own ai chat" on public.ai_chat_messages
  for delete using (user_id = auth.uid());
-- Inserts are done only by the ai-astrologer edge function (service role bypasses RLS).
