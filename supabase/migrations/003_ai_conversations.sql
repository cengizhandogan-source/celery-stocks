-- =============================================
-- Celery Stocks: AI Chat Persistence Schema
-- =============================================

-- 1. AI Conversations
create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ai_conversations_user on ai_conversations(user_id, updated_at desc);

alter table ai_conversations enable row level security;

create policy "Users can CRUD own AI conversations"
  on ai_conversations for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. AI Messages
create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index idx_ai_messages_conversation on ai_messages(conversation_id, created_at);

alter table ai_messages enable row level security;

create policy "Users can CRUD own AI messages"
  on ai_messages for all to authenticated
  using (conversation_id in (select id from ai_conversations where user_id = auth.uid()))
  with check (conversation_id in (select id from ai_conversations where user_id = auth.uid()));
