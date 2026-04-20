-- =============================================
-- Comment likes (mirrors post_likes)
-- =============================================

alter table post_comments add column like_count integer not null default 0;

create table comment_likes (
  comment_id uuid not null references post_comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index idx_comment_likes_comment on comment_likes(comment_id);

alter table comment_likes enable row level security;

create policy "Comment likes viewable by authenticated"
  on comment_likes for select to authenticated using (true);

create policy "Users can like comments"
  on comment_likes for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can unlike comments"
  on comment_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function update_comment_like_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update post_comments set like_count = like_count + 1 where id = NEW.comment_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update post_comments set like_count = like_count - 1 where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_comment_like_change
  after insert or delete on comment_likes
  for each row execute function update_comment_like_count();

-- post_comments is already in supabase_realtime (migration 011).
-- Ensure UPDATE events include the full row so clients see like_count changes
-- written by the update_comment_like_count trigger.
alter table post_comments replica identity full;
