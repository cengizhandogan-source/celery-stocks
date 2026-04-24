-- Drop unused tables: chat, AI conversations, portfolios, user layouts, strategies.

-- 1. Remove tables from realtime publication
alter publication supabase_realtime drop table messages;
alter publication supabase_realtime drop table strategy_signals;

-- 2. Rebuild direct_messages without strategy_id
alter table direct_messages drop constraint dm_has_payload;
alter table direct_messages drop column strategy_id;
alter table direct_messages
  add constraint dm_has_payload check (
    (content is not null and length(btrim(content)) > 0)
    or post_id is not null
  );

-- 3. Drop strategy_id column from posts
alter table posts drop column strategy_id;

-- 4. Drop chat tables in FK order
drop table messages;
drop table chatroom_members;
drop table chatrooms;

-- 5. Drop AI conversation tables
drop table ai_messages;
drop table ai_conversations;

-- 6. Drop portfolio tables
drop table positions;
drop table portfolio_snapshots;
drop table portfolios;

-- 7. Drop user layouts
drop table user_layouts;

-- 8. Drop strategy tables
drop table strategy_imports;
drop table strategy_signals;
drop table strategy_backtest_results;
drop table strategies;
