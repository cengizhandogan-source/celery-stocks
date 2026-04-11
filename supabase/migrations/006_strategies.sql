-- strategies: user-authored trading strategies
create table strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null check (char_length(name) <= 100),
  description text not null default '',
  code text not null,
  symbols text[] not null default '{}',
  parameters jsonb not null default '{}',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- strategy_backtest_results: performance snapshots from backtests
create table strategy_backtest_results (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id) on delete cascade,
  total_return numeric,
  win_rate numeric,
  sharpe_ratio numeric,
  max_drawdown numeric,
  total_trades integer,
  backtest_range text,
  equity_curve jsonb,
  computed_at timestamptz not null default now()
);

-- strategy_signals: real-time signals emitted by strategies
create table strategy_signals (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  signal text not null check (signal in ('buy', 'sell', 'hold')),
  price numeric not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  reason text,
  created_at timestamptz not null default now()
);

-- strategy_imports: tracks who imported what
create table strategy_imports (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (strategy_id, user_id)
);

-- Add strategy_id FK to messages and direct_messages for chip sharing
alter table messages add column strategy_id uuid references strategies(id);
alter table direct_messages add column strategy_id uuid references strategies(id);

-- Indexes
create index idx_strategies_user on strategies(user_id);
create index idx_strategies_public on strategies(is_public, created_at desc);
create index idx_strategy_signals_strategy on strategy_signals(strategy_id, created_at desc);
create index idx_strategy_signals_user on strategy_signals(user_id, created_at desc);
create index idx_strategy_imports_strategy on strategy_imports(strategy_id);

-- RLS
alter table strategies enable row level security;
alter table strategy_backtest_results enable row level security;
alter table strategy_signals enable row level security;
alter table strategy_imports enable row level security;

-- Strategies: owner full access, public ones readable by all authenticated
create policy "Users can manage own strategies"
  on strategies for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public strategies readable"
  on strategies for select to authenticated
  using (is_public = true);

-- Backtest results: readable if you can read the strategy
create policy "Backtest results follow strategy access"
  on strategy_backtest_results for select to authenticated
  using (
    exists (
      select 1 from strategies s
      where s.id = strategy_id
        and (s.user_id = auth.uid() or s.is_public = true)
    )
  );

create policy "Users can insert own backtest results"
  on strategy_backtest_results for insert to authenticated
  with check (
    exists (
      select 1 from strategies s
      where s.id = strategy_id and s.user_id = auth.uid()
    )
  );

-- Signals: owner only
create policy "Users can manage own signals"
  on strategy_signals for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Imports: user can manage own, everyone can read counts
create policy "Users can manage own imports"
  on strategy_imports for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Import counts readable"
  on strategy_imports for select to authenticated
  using (true);

-- Realtime for signals
alter publication supabase_realtime add table strategy_signals;
