-- =============================================
-- Comments on posts
-- =============================================

-- 1. Add comment_count to posts
alter table posts add column comment_count integer not null default 0;

-- 2. Comments table
create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_post_comments_post on post_comments(post_id, created_at asc);
create index idx_post_comments_user on post_comments(user_id);

alter table post_comments enable row level security;

create policy "Comments viewable by authenticated"
  on post_comments for select to authenticated using (true);

create policy "Users can create comments"
  on post_comments for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on post_comments for delete to authenticated using (auth.uid() = user_id);

-- 3. Trigger to maintain comment_count
create or replace function update_post_comment_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = NEW.post_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update posts set comment_count = comment_count - 1 where id = OLD.post_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_post_comment_change
  after insert or delete on post_comments
  for each row execute function update_post_comment_count();

-- 4. Enable realtime
alter publication supabase_realtime add table post_comments;
