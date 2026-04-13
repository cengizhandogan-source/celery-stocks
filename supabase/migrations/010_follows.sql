-- =============================================
-- Follow system & profile stats
-- =============================================

-- 1. Add denormalized count columns to profiles
alter table profiles add column follower_count integer not null default 0;
alter table profiles add column following_count integer not null default 0;
alter table profiles add column post_count integer not null default 0;

-- Backfill post_count from existing data
update profiles set post_count = (
  select count(*) from posts where posts.user_id = profiles.id
);

-- 2. Follows table
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);

alter table follows enable row level security;

create policy "Follows viewable by authenticated"
  on follows for select to authenticated using (true);

create policy "Users can follow others"
  on follows for insert to authenticated with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on follows for delete to authenticated using (auth.uid() = follower_id);

-- 3. Trigger to maintain follower_count and following_count
create or replace function update_follow_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = NEW.follower_id;
    update profiles set follower_count = follower_count + 1 where id = NEW.following_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update profiles set following_count = following_count - 1 where id = OLD.follower_id;
    update profiles set follower_count = follower_count - 1 where id = OLD.following_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_follow_change
  after insert or delete on follows
  for each row execute function update_follow_counts();

-- 4. Trigger to maintain post_count on profiles
create or replace function update_post_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set post_count = post_count + 1 where id = NEW.user_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update profiles set post_count = post_count - 1 where id = OLD.user_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_count_change
  after insert or delete on posts
  for each row execute function update_post_count();

-- 5. Enable realtime
alter publication supabase_realtime add table follows;
