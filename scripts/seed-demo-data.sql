-- =============================================================================
-- CELERY TOKENS — Demo Data Seed Script for Marketing Screenshots
-- =============================================================================
--
-- HOW TO USE:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Replace YOUR_USER_ID_HERE with your actual user ID (uuid from profiles table)
-- 3. Run the CLEANUP section first to clear any previous demo data
-- 4. Run ONE scenario at a time, take your screenshot, then cleanup before the next
-- 5. Each scenario creates exchange connections + holdings + trades
--
-- To find your user ID:
--   SELECT id, username, display_name FROM profiles;
--
-- =============================================================================

-- ██████████████████████████████████████████████████████████████████████████████
-- STEP 0: SET YOUR USER ID
-- ██████████████████████████████████████████████████████████████████████████████

-- Replace this with your actual user ID from the profiles table
DO $$ BEGIN PERFORM set_config('my.user_id', 'YOUR_USER_ID_HERE', false); END $$;


-- ██████████████████████████████████████████████████████████████████████████████
-- CLEANUP — Run this BEFORE each scenario to reset
-- ██████████████████████████████████████████████████████████████████████████████

DELETE FROM cached_trades WHERE user_id = current_setting('my.user_id')::uuid;
DELETE FROM cached_holdings WHERE user_id = current_setting('my.user_id')::uuid;
DELETE FROM exchange_connections WHERE user_id = current_setting('my.user_id')::uuid;
DELETE FROM net_worth_snapshots WHERE user_id = current_setting('my.user_id')::uuid;
UPDATE profiles SET crypto_net_worth = NULL, show_net_worth = true, show_holdings = true
  WHERE id = current_setting('my.user_id')::uuid;


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 1: $247k Whale Portfolio (Multi-Exchange)
-- Title: "$247,000 in crypto. Took me 2 years."
-- ██████████████████████████████████████████████████████████████████████████████

-- Exchange connections (dummy encrypted keys — just for FK reference)
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Main Binance', '\x00000000000000000000000000000001', '\x00000000000000000000000000000001', '\x00000000000000000000000000000001', true, now()),
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid,
   'coinbase', 'Coinbase', '\x00000000000000000000000000000002', '\x00000000000000000000000000000002', '\x00000000000000000000000000000002', true, now()),
  ('a1000000-0000-0000-0000-000000000003'::uuid, current_setting('my.user_id')::uuid,
   'kraken', 'Kraken', '\x00000000000000000000000000000003', '\x00000000000000000000000000000003', '\x00000000000000000000000000000003', true, now());

-- Holdings across 3 exchanges — total ~$247,000
INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  -- Binance: BTC + ETH + SOL
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 1.15, 0, 98900.00, 86000.00, now()),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 12.5, 0, 42500.00, 3400.00, now()),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 185.0, 0, 33300.00, 180.00, now()),
  -- Coinbase: BTC + LINK + AVAX
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.45, 0, 38700.00, 86000.00, now()),
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'LINK', 850.0, 0, 14450.00, 17.00, now()),
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'AVAX', 320.0, 0, 9600.00, 30.00, now()),
  -- Kraken: ETH + DOT
  ('a1000000-0000-0000-0000-000000000003'::uuid, current_setting('my.user_id')::uuid, 'ETH', 2.0, 0, 6800.00, 3400.00, now()),
  ('a1000000-0000-0000-0000-000000000003'::uuid, current_setting('my.user_id')::uuid, 'DOT', 400.0, 0, 2800.00, 7.00, now());
  -- Total: ~$247,050

-- Trade history (recent buys showing accumulation over time)
INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S1T001', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.25, 29500.00, 7375.00, 7.37, 'USDT', '2024-03-15T10:30:00Z'),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S1T002', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.30, 42000.00, 12600.00, 12.60, 'USDT', '2024-07-22T14:15:00Z'),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S1T003', 'ETHUSDT', 'ETH', 'USDT', 'buy', 5.0, 1800.00, 9000.00, 9.00, 'USDT', '2024-04-10T09:00:00Z'),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S1T004', 'SOLUSDT', 'SOL', 'USDT', 'buy', 100.0, 22.00, 2200.00, 2.20, 'USDT', '2024-02-05T16:45:00Z'),
  ('a1000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S1T005', 'SOLUSDT', 'SOL', 'USDT', 'buy', 85.0, 95.00, 8075.00, 8.07, 'USDT', '2024-11-20T11:30:00Z'),
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'S1T006', 'BTCUSD', 'BTC', 'USD', 'buy', 0.45, 35000.00, 15750.00, 15.75, 'USD', '2024-05-18T08:20:00Z'),
  ('a1000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'S1T007', 'LINKUSD', 'LINK', 'USD', 'buy', 850.0, 7.50, 6375.00, 6.37, 'USD', '2024-06-30T13:00:00Z');

-- Net worth history (shows growth over time for chart)
INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2024-01-15', 35000),
  (current_setting('my.user_id')::uuid, '2024-03-15', 52000),
  (current_setting('my.user_id')::uuid, '2024-05-15', 68000),
  (current_setting('my.user_id')::uuid, '2024-07-15', 95000),
  (current_setting('my.user_id')::uuid, '2024-09-15', 110000),
  (current_setting('my.user_id')::uuid, '2024-11-15', 165000),
  (current_setting('my.user_id')::uuid, '2025-01-15', 198000),
  (current_setting('my.user_id')::uuid, '2025-03-15', 230000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 247050);


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 2: $100k Six Figure Milestone
-- Title: "Just crossed $100,000 in crypto. I'm 26."
-- ██████████████████████████████████████████████████████████████████████████████
-- Run CLEANUP first, then uncomment and run this block

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance', '\x00000000000000000000000000000010', '\x00000000000000000000000000000010', '\x00000000000000000000000000000010', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.72, 0, 61920.00, 86000.00, now()),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 6.0, 0, 20400.00, 3400.00, now()),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 65.0, 0, 11700.00, 180.00, now()),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 6227.00, 0, 6227.00, 1.00, now());
  -- Total: ~$100,247

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S2T001', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.15, 19500.00, 2925.00, 2.92, 'USDT', '2022-11-20T10:00:00Z'),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S2T002', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.20, 27000.00, 5400.00, 5.40, 'USDT', '2023-06-15T14:00:00Z'),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S2T003', 'ETHUSDT', 'ETH', 'USDT', 'buy', 3.0, 1200.00, 3600.00, 3.60, 'USDT', '2022-12-10T09:30:00Z'),
  ('a2000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S2T004', 'SOLUSDT', 'SOL', 'USDT', 'buy', 65.0, 12.00, 780.00, 0.78, 'USDT', '2023-01-05T16:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2022-11-01', 8000),
  (current_setting('my.user_id')::uuid, '2023-03-01', 15000),
  (current_setting('my.user_id')::uuid, '2023-06-01', 22000),
  (current_setting('my.user_id')::uuid, '2023-09-01', 28000),
  (current_setting('my.user_id')::uuid, '2023-12-01', 45000),
  (current_setting('my.user_id')::uuid, '2024-03-01', 58000),
  (current_setting('my.user_id')::uuid, '2024-06-01', 65000),
  (current_setting('my.user_id')::uuid, '2024-09-01', 72000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 88000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 100247);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 3: $85k Young Trader
-- Title: "I'm 23 with $85,000 in crypto."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'bybit', 'Bybit', '\x00000000000000000000000000000020', '\x00000000000000000000000000000020', '\x00000000000000000000000000000020', true, now()),
  ('a3000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance', '\x00000000000000000000000000000021', '\x00000000000000000000000000000021', '\x00000000000000000000000000000021', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.50, 0, 43000.00, 86000.00, now()),
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 120.0, 0, 21600.00, 180.00, now()),
  ('a3000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'ETH', 4.0, 0, 13600.00, 3400.00, now()),
  ('a3000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'MATIC', 2500.0, 0, 2750.00, 1.10, now()),
  ('a3000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'ARB', 3200.0, 0, 4050.00, 1.27, now());
  -- Total: ~$85,000

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S3T001', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.10, 16800.00, 1680.00, 1.68, 'USDT', '2023-01-15T10:00:00Z'),
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S3T002', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.10, 25000.00, 2500.00, 2.50, 'USDT', '2023-07-20T14:00:00Z'),
  ('a3000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S3T003', 'SOLUSDT', 'SOL', 'USDT', 'buy', 80.0, 10.00, 800.00, 0.80, 'USDT', '2023-02-10T09:00:00Z'),
  ('a3000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'S3T004', 'ETHUSDT', 'ETH', 'USDT', 'buy', 2.0, 1100.00, 2200.00, 2.20, 'USDT', '2023-03-05T16:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2023-01-01', 3200),
  (current_setting('my.user_id')::uuid, '2023-06-01', 12000),
  (current_setting('my.user_id')::uuid, '2023-12-01', 28000),
  (current_setting('my.user_id')::uuid, '2024-06-01', 48000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 68000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 85000);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 4: $192k BTC Maximalist
-- Title: "$192,000 in BTC. Boring strategy, boring coins."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'coinbase', 'Coinbase', '\x00000000000000000000000000000030', '\x00000000000000000000000000000030', '\x00000000000000000000000000000030', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 2.23, 0, 191780.00, 86000.00, now()),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDC', 320.00, 0, 320.00, 1.00, now());
  -- Total: ~$192,100

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T001', 'BTCUSD', 'BTC', 'USD', 'buy', 0.50, 16500.00, 8250.00, 8.25, 'USD', '2022-11-15T10:00:00Z'),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T002', 'BTCUSD', 'BTC', 'USD', 'buy', 0.30, 23000.00, 6900.00, 6.90, 'USD', '2023-03-20T14:00:00Z'),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T003', 'BTCUSD', 'BTC', 'USD', 'buy', 0.25, 29000.00, 7250.00, 7.25, 'USD', '2023-08-10T09:00:00Z'),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T004', 'BTCUSD', 'BTC', 'USD', 'buy', 0.40, 38000.00, 15200.00, 15.20, 'USD', '2024-02-14T16:00:00Z'),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T005', 'BTCUSD', 'BTC', 'USD', 'buy', 0.35, 52000.00, 18200.00, 18.20, 'USD', '2024-06-30T11:00:00Z'),
  ('a4000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S4T006', 'BTCUSD', 'BTC', 'USD', 'buy', 0.43, 68000.00, 29240.00, 29.24, 'USD', '2025-01-10T08:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2022-11-01', 8250),
  (current_setting('my.user_id')::uuid, '2023-03-01', 22000),
  (current_setting('my.user_id')::uuid, '2023-08-01', 38000),
  (current_setting('my.user_id')::uuid, '2024-02-01', 72000),
  (current_setting('my.user_id')::uuid, '2024-06-01', 105000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 148000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 192100);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 5: $120k → $3,400 Collapse (Loss Porn)
-- Title: "Portfolio was $120,000 in January. It's $3,400 now."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance', '\x00000000000000000000000000000040', '\x00000000000000000000000000000040', '\x00000000000000000000000000000040', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'LUNC', 850000.0, 0, 680.00, 0.0008, now()),
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'FTT', 4200.0, 0, 420.00, 0.10, now()),
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 2300.00, 0, 2300.00, 1.00, now());
  -- Total: ~$3,400

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S5T001', 'LUNAUSDT', 'LUNA', 'USDT', 'buy', 1200.0, 85.00, 102000.00, 102.00, 'USDT', '2022-04-05T10:00:00Z'),
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S5T002', 'FTTUSDT', 'FTT', 'USDT', 'buy', 4200.0, 4.50, 18900.00, 18.90, 'USDT', '2022-09-15T14:00:00Z'),
  ('a5000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S5T003', 'LUNAUSDT', 'LUNA', 'USDT', 'sell', 1200.0, 0.0008, 0.96, 0.001, 'USDT', '2022-05-12T02:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2022-01-01', 45000),
  (current_setting('my.user_id')::uuid, '2022-03-01', 95000),
  (current_setting('my.user_id')::uuid, '2022-04-15', 120000),
  (current_setting('my.user_id')::uuid, '2022-05-15', 8500),
  (current_setting('my.user_id')::uuid, '2022-08-01', 22000),
  (current_setting('my.user_id')::uuid, '2022-11-15', 6200),
  (current_setting('my.user_id')::uuid, '2023-06-01', 5100),
  (current_setting('my.user_id')::uuid, '2024-06-01', 4200),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 3400);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 6: $47k Leverage Liquidation (Loss Porn)
-- Title: "Lost $47,000 in one night. 10x leverage."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'bybit', 'Bybit', '\x00000000000000000000000000000050', '\x00000000000000000000000000000050', '\x00000000000000000000000000000050', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 243.00, 0, 243.00, 1.00, now()),
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 0.002, 0, 6.80, 3400.00, now());
  -- Total: ~$250 (almost nothing left)

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S6T001', 'ETHUSDT', 'ETH', 'USDT', 'buy', 14.0, 3350.00, 46900.00, 46.90, 'USDT', '2025-03-28T22:00:00Z'),
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S6T002', 'ETHUSDT', 'ETH', 'USDT', 'sell', 14.0, 3215.00, 45010.00, 45.01, 'USDT', '2025-03-29T03:15:00Z'),
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S6T003', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.05, 65000.00, 3250.00, 3.25, 'USDT', '2025-02-15T10:00:00Z'),
  ('a6000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S6T004', 'BTCUSDT', 'BTC', 'USDT', 'sell', 0.05, 63000.00, 3150.00, 3.15, 'USDT', '2025-02-20T14:30:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2024-12-01', 52000),
  (current_setting('my.user_id')::uuid, '2025-01-15', 48000),
  (current_setting('my.user_id')::uuid, '2025-02-15', 47200),
  (current_setting('my.user_id')::uuid, '2025-03-15', 47000),
  (current_setting('my.user_id')::uuid, '2025-03-28', 47000),
  (current_setting('my.user_id')::uuid, '2025-03-29', 250),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 250);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 7: $340k Diversified Whale
-- Title: "$340,000 portfolio. Boring strategy, boring coins, boring guy."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a7000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance Main', '\x00000000000000000000000000000060', '\x00000000000000000000000000000060', '\x00000000000000000000000000000060', true, now()),
  ('a7000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid,
   'coinbase', 'Coinbase', '\x00000000000000000000000000000061', '\x00000000000000000000000000000061', '\x00000000000000000000000000000061', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  -- 70% BTC
  ('a7000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 1.80, 0, 154800.00, 86000.00, now()),
  ('a7000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'BTC', 1.00, 0, 86000.00, 86000.00, now()),
  -- 20% ETH
  ('a7000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 12.0, 0, 40800.00, 3400.00, now()),
  ('a7000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'ETH', 8.0, 0, 27200.00, 3400.00, now()),
  -- 10% stables
  ('a7000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 18000.00, 0, 18000.00, 1.00, now()),
  ('a7000000-0000-0000-0000-000000000002'::uuid, current_setting('my.user_id')::uuid, 'USDC', 13200.00, 0, 13200.00, 1.00, now());
  -- Total: ~$340,000

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2021-06-01', 50000),
  (current_setting('my.user_id')::uuid, '2021-12-01', 120000),
  (current_setting('my.user_id')::uuid, '2022-06-01', 65000),
  (current_setting('my.user_id')::uuid, '2022-12-01', 55000),
  (current_setting('my.user_id')::uuid, '2023-06-01', 95000),
  (current_setting('my.user_id')::uuid, '2023-12-01', 180000),
  (current_setting('my.user_id')::uuid, '2024-06-01', 245000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 305000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 340000);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 8: $68k Growth Story ("Started with $2k")
-- Title: "Started with $2,000 two years ago. Portfolio just hit $68,000."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance', '\x00000000000000000000000000000070', '\x00000000000000000000000000000070', '\x00000000000000000000000000000070', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.36, 0, 30960.00, 86000.00, now()),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 5.0, 0, 17000.00, 3400.00, now()),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 75.0, 0, 13500.00, 180.00, now()),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'DOGE', 15000.0, 0, 3000.00, 0.20, now()),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 3787.00, 0, 3787.00, 1.00, now());
  -- Total: ~$68,247

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T001', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.05, 26000.00, 1300.00, 1.30, 'USDT', '2024-04-10T10:00:00Z'),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T002', 'ETHUSDT', 'ETH', 'USDT', 'buy', 0.5, 1600.00, 800.00, 0.80, 'USDT', '2024-04-15T14:00:00Z'),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T003', 'SOLUSDT', 'SOL', 'USDT', 'buy', 15.0, 20.00, 300.00, 0.30, 'USDT', '2024-05-01T09:00:00Z'),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T004', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.05, 42000.00, 2100.00, 2.10, 'USDT', '2024-08-20T16:00:00Z'),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T005', 'ETHUSDT', 'ETH', 'USDT', 'buy', 1.0, 2400.00, 2400.00, 2.40, 'USDT', '2024-10-05T11:00:00Z'),
  ('a8000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S8T006', 'SOLUSDT', 'SOL', 'USDT', 'buy', 20.0, 150.00, 3000.00, 3.00, 'USDT', '2025-01-15T08:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2024-04-01', 2000),
  (current_setting('my.user_id')::uuid, '2024-06-01', 5500),
  (current_setting('my.user_id')::uuid, '2024-08-01', 12000),
  (current_setting('my.user_id')::uuid, '2024-10-01', 22000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 38000),
  (current_setting('my.user_id')::uuid, '2025-02-01', 52000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 68247);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 9: $55k Turkish Lira Hedge (~1.8M TL)
-- Title: "Kripto portföyüm 1.8 milyon TL'yi geçti."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'Binance TR', '\x00000000000000000000000000000080', '\x00000000000000000000000000000080', '\x00000000000000000000000000000080', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.35, 0, 30100.00, 86000.00, now()),
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 3.5, 0, 11900.00, 3400.00, now()),
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 40.0, 0, 7200.00, 180.00, now()),
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'AVAX', 120.0, 0, 3600.00, 30.00, now()),
  ('a9000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 2200.00, 0, 2200.00, 1.00, now());
  -- Total: ~$55,000 (~1.8M TL at 33 TL/USD)

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2024-06-01', 3000),
  (current_setting('my.user_id')::uuid, '2024-08-01', 8500),
  (current_setting('my.user_id')::uuid, '2024-10-01', 18000),
  (current_setting('my.user_id')::uuid, '2024-12-01', 32000),
  (current_setting('my.user_id')::uuid, '2025-02-01', 42000),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 55000);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- SCENARIO 10: $2k Beginner Portfolio (+12%)
-- Title: "First month in crypto. Only put in $2,000."
-- ██████████████████████████████████████████████████████████████████████████████

/*
INSERT INTO exchange_connections (id, user_id, exchange, label, api_key_enc, api_secret_enc, iv, is_valid, last_synced_at)
VALUES
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid,
   'binance', 'First Account', '\x00000000000000000000000000000090', '\x00000000000000000000000000000090', '\x00000000000000000000000000000090', true, now());

INSERT INTO cached_holdings (connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at) VALUES
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'BTC', 0.012, 0, 1032.00, 86000.00, now()),
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'ETH', 0.15, 0, 510.00, 3400.00, now()),
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'SOL', 3.5, 0, 630.00, 180.00, now()),
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'USDT', 68.00, 0, 68.00, 1.00, now());
  -- Total: ~$2,240 (~+12%)

INSERT INTO cached_trades (connection_id, user_id, exchange_trade_id, symbol, base_asset, quote_asset, side, quantity, price, quote_qty, fee, fee_asset, executed_at) VALUES
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S10T001', 'BTCUSDT', 'BTC', 'USDT', 'buy', 0.012, 80000.00, 960.00, 0.96, 'USDT', '2026-03-15T10:00:00Z'),
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S10T002', 'ETHUSDT', 'ETH', 'USDT', 'buy', 0.15, 3100.00, 465.00, 0.46, 'USDT', '2026-03-15T10:05:00Z'),
  ('aa000000-0000-0000-0000-000000000001'::uuid, current_setting('my.user_id')::uuid, 'S10T003', 'SOLUSDT', 'SOL', 'USDT', 'buy', 3.5, 160.00, 560.00, 0.56, 'USDT', '2026-03-16T14:00:00Z');

INSERT INTO net_worth_snapshots (user_id, date, total_usd) VALUES
  (current_setting('my.user_id')::uuid, '2026-03-15', 2000),
  (current_setting('my.user_id')::uuid, '2026-03-22', 2050),
  (current_setting('my.user_id')::uuid, '2026-03-29', 2120),
  (current_setting('my.user_id')::uuid, '2026-04-05', 2180),
  (current_setting('my.user_id')::uuid, CURRENT_DATE, 2240);
*/


-- ██████████████████████████████████████████████████████████████████████████████
-- PROFILE SETTINGS — Run once to make net worth and holdings visible
-- ██████████████████████████████████████████████████████████████████████████████

UPDATE profiles SET
  show_net_worth = true,
  show_holdings = true
WHERE id = current_setting('my.user_id')::uuid;
