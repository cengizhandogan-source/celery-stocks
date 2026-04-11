-- =============================================
-- Feed: Replace ideas with multi-type posts
-- =============================================

-- 1. Posts table (replaces ideas)
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  post_type text not null check (post_type in ('text', 'position', 'strategy')),
  content text,
  symbol text,
  sentiment text check (sentiment is null or sentiment in ('bullish', 'bearish', 'neutral')),
  -- Position-specific
  position_symbol text,
  position_shares numeric,
  position_avg_cost numeric,
  -- Strategy-specific
  strategy_id uuid references strategies(id) on delete set null,
  -- Engagement
  like_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_posts_created on posts(created_at desc);
create index idx_posts_type on posts(post_type, created_at desc);
create index idx_posts_symbol on posts(symbol, created_at desc);
create index idx_posts_user on posts(user_id, created_at desc);

alter table posts enable row level security;

create policy "Posts viewable by authenticated"
  on posts for select to authenticated using (true);

create policy "Authenticated users can create posts"
  on posts for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can delete own posts"
  on posts for delete to authenticated using (auth.uid() = user_id);

-- 2. Post likes
create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index idx_post_likes_post on post_likes(post_id);

alter table post_likes enable row level security;

create policy "Likes viewable by authenticated"
  on post_likes for select to authenticated using (true);

create policy "Users can like posts"
  on post_likes for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can unlike posts"
  on post_likes for delete to authenticated using (auth.uid() = user_id);

-- 3. Trigger to maintain like_count
create or replace function update_post_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set like_count = like_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update posts set like_count = like_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_like_change
  after insert or delete on post_likes
  for each row execute function update_post_like_count();

-- 4. Migrate existing ideas to posts
insert into posts (id, user_id, post_type, content, symbol, sentiment, created_at)
select id, user_id, 'text', title || E'\n' || content, symbol, sentiment, created_at
from ideas;

-- 5. Drop old ideas table
alter publication supabase_realtime drop table ideas;
drop table ideas;

-- 6. Enable realtime on new tables
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table post_likes;
