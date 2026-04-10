-- =============================================
-- Celery Stocks: Portfolio Feature Schema
-- =============================================

-- 1. Portfolios
create table portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) <= 50),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_portfolios_user on portfolios(user_id);

alter table portfolios enable row level security;

create policy "Users can CRUD own portfolios"
  on portfolios for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Positions (holdings within a portfolio)
create table positions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  symbol text not null,
  shares numeric not null check (shares > 0),
  avg_cost numeric not null check (avg_cost >= 0),
  added_at timestamptz not null default now()
);

create index idx_positions_portfolio on positions(portfolio_id);

alter table positions enable row level security;

create policy "Users can CRUD own positions"
  on positions for all to authenticated
  using (portfolio_id in (select id from portfolios where user_id = auth.uid()))
  with check (portfolio_id in (select id from portfolios where user_id = auth.uid()));

-- 3. Portfolio snapshots (daily value for performance chart)
create table portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  date date not null,
  total_value numeric not null,
  total_cost numeric not null,
  day_change numeric not null default 0,
  unique (portfolio_id, date)
);

create index idx_snapshots_portfolio_date on portfolio_snapshots(portfolio_id, date);

alter table portfolio_snapshots enable row level security;

create policy "Users can CRUD own snapshots"
  on portfolio_snapshots for all to authenticated
  using (portfolio_id in (select id from portfolios where user_id = auth.uid()))
  with check (portfolio_id in (select id from portfolios where user_id = auth.uid()));
