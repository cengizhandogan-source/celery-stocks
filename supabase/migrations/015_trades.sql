-- Cached trades from exchange APIs
create table cached_trades (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references exchange_connections(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  exchange_trade_id text not null,
  symbol text not null,
  base_asset text not null,
  quote_asset text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric not null,
  price numeric not null,
  quote_qty numeric not null,
  fee numeric not null default 0,
  fee_asset text,
  executed_at timestamptz not null,
  synced_at timestamptz not null default now(),
  unique (connection_id, exchange_trade_id)
);

create index idx_cached_trades_user on cached_trades(user_id);
create index idx_cached_trades_user_date on cached_trades(user_id, executed_at desc);

alter table cached_trades enable row level security;

create policy "Users can view own trades"
  on cached_trades for select using (auth.uid() = user_id);

create policy "Users can manage own trades"
  on cached_trades for all using (auth.uid() = user_id);

-- Expand posts post_type to include 'trade'
alter table posts drop constraint posts_post_type_check;
alter table posts add constraint posts_post_type_check
  check (post_type in ('text', 'position', 'strategy', 'trade'));

-- Trade-specific columns on posts
alter table posts add column trade_symbol text;
alter table posts add column trade_side text check (trade_side is null or trade_side in ('buy', 'sell'));
alter table posts add column trade_qty numeric;
alter table posts add column trade_price numeric;
alter table posts add column trade_quote_qty numeric;
alter table posts add column trade_pnl numeric;
alter table posts add column trade_executed_at timestamptz;
