-- =============================================
-- Crypto wallet integration
-- =============================================

-- 1. Add wallet fields to profiles
alter table profiles add column crypto_net_worth numeric default null;
alter table profiles add column show_net_worth boolean not null default false;
alter table profiles add column show_holdings boolean not null default false;
alter table profiles add column net_worth_updated_at timestamptz;

-- 2. Exchange connections table (encrypted credentials)
create table exchange_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exchange text not null,
  label text not null default '',
  api_key_enc bytea not null,
  api_secret_enc bytea not null,
  passphrase_enc bytea,
  iv bytea not null,
  is_valid boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exchange, api_key_enc)
);

create index idx_exchange_connections_user on exchange_connections(user_id);

alter table exchange_connections enable row level security;

create policy "Users can view own connections"
  on exchange_connections for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add own connections"
  on exchange_connections for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own connections"
  on exchange_connections for update to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own connections"
  on exchange_connections for delete to authenticated
  using (auth.uid() = user_id);

-- 3. Cached holdings table
create table cached_holdings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references exchange_connections(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  asset text not null,
  free_balance numeric not null default 0,
  locked_balance numeric not null default 0,
  usd_value numeric,
  price_at_sync numeric,
  synced_at timestamptz not null default now()
);

create index idx_cached_holdings_user on cached_holdings(user_id);
create index idx_cached_holdings_connection on cached_holdings(connection_id);

alter table cached_holdings enable row level security;

create policy "Users can view own holdings"
  on cached_holdings for select to authenticated
  using (auth.uid() = user_id);

create policy "Public holdings viewable when opted in"
  on cached_holdings for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = cached_holdings.user_id
      and profiles.show_holdings = true
    )
  );

create policy "Users can manage own holdings"
  on cached_holdings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on cached_holdings for update to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own holdings"
  on cached_holdings for delete to authenticated
  using (auth.uid() = user_id);

-- 4. Net worth snapshots for historical charting
create table net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  total_usd numeric not null,
  unique (user_id, date)
);

create index idx_net_worth_snapshots_user on net_worth_snapshots(user_id);

alter table net_worth_snapshots enable row level security;

create policy "Users can view own snapshots"
  on net_worth_snapshots for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can manage own snapshots"
  on net_worth_snapshots for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own snapshots"
  on net_worth_snapshots for update to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own snapshots"
  on net_worth_snapshots for delete to authenticated
  using (auth.uid() = user_id);

-- 5. Trigger to maintain crypto_net_worth on profiles
create or replace function update_crypto_net_worth()
returns trigger as $$
declare
  target_user_id uuid;
begin
  if TG_OP = 'DELETE' then
    target_user_id := OLD.user_id;
  else
    target_user_id := NEW.user_id;
  end if;

  update profiles set
    crypto_net_worth = (
      select coalesce(sum(usd_value), 0)
      from cached_holdings
      where cached_holdings.user_id = target_user_id
    ),
    net_worth_updated_at = now()
  where id = target_user_id;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_holdings_change
  after insert or update or delete on cached_holdings
  for each row execute function update_crypto_net_worth();

-- 6. Enable realtime
alter publication supabase_realtime add table exchange_connections;
