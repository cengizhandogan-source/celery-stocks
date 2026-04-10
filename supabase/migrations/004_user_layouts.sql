-- =============================================
-- Celery Stocks: User Canvas Layout Persistence
-- =============================================

-- Store the entire canvas layout as a JSONB blob per user
create table user_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layout_data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index idx_user_layouts_user on user_layouts(user_id);

alter table user_layouts enable row level security;

create policy "Users can CRUD own layouts"
  on user_layouts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
