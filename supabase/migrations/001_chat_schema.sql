-- =============================================
-- Celery Stocks: Chat Feature Schema
-- =============================================

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_color text not null default '#4ade80',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Chatrooms
create table chatrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  symbol text,
  created_by uuid not null references profiles(id),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table chatrooms enable row level security;

create policy "Chatrooms viewable by authenticated"
  on chatrooms for select to authenticated using (true);

create policy "Authenticated users can create chatrooms"
  on chatrooms for insert to authenticated with check (auth.uid() = created_by);

-- 3. Chatroom members
create table chatroom_members (
  chatroom_id uuid not null references chatrooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (chatroom_id, user_id)
);

alter table chatroom_members enable row level security;

create policy "Members viewable by authenticated"
  on chatroom_members for select to authenticated using (true);

create policy "Users can join rooms"
  on chatroom_members for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can leave rooms"
  on chatroom_members for delete to authenticated using (auth.uid() = user_id);

-- 4. Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  chatroom_id uuid not null references chatrooms(id) on delete cascade,
  user_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_messages_chatroom_created on messages(chatroom_id, created_at desc);

alter table messages enable row level security;

create policy "Messages viewable by authenticated"
  on messages for select to authenticated using (true);

create policy "Authenticated users can insert messages"
  on messages for insert to authenticated with check (auth.uid() = user_id);

-- 5. Direct messages
create table direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id),
  receiver_id uuid not null references profiles(id),
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_dm_participants on direct_messages(sender_id, receiver_id, created_at desc);
create index idx_dm_receiver on direct_messages(receiver_id, created_at desc);

alter table direct_messages enable row level security;

create policy "Users can view own DMs"
  on direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send DMs"
  on direct_messages for insert to authenticated
  with check (auth.uid() = sender_id);

create policy "Receiver can mark as read"
  on direct_messages for update to authenticated
  using (auth.uid() = receiver_id);

-- 6. Ideas
create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  symbol text not null,
  title text not null,
  content text not null,
  sentiment text not null check (sentiment in ('bullish', 'bearish', 'neutral')),
  created_at timestamptz not null default now()
);

create index idx_ideas_symbol on ideas(symbol, created_at desc);
create index idx_ideas_created on ideas(created_at desc);

alter table ideas enable row level security;

create policy "Ideas viewable by authenticated"
  on ideas for select to authenticated using (true);

create policy "Authenticated users can post ideas"
  on ideas for insert to authenticated with check (auth.uid() = user_id);

-- =============================================
-- Enable Realtime on chat tables
-- =============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table direct_messages;
alter publication supabase_realtime add table ideas;
