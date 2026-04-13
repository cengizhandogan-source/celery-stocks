-- =============================================
-- Allow anonymous (unauthenticated) users to
-- read feed, posts, profiles, and comments
-- =============================================

-- Profiles: anon can view all profiles
create policy "Profiles viewable by anon"
  on profiles for select to anon using (true);

-- Posts: anon can view all posts
create policy "Posts viewable by anon"
  on posts for select to anon using (true);

-- Comments: anon can view all comments
create policy "Comments viewable by anon"
  on post_comments for select to anon using (true);

-- Likes: anon can view all likes (needed for like counts / joins)
create policy "Likes viewable by anon"
  on post_likes for select to anon using (true);

-- Follows: anon can view follows (needed for follower counts on profiles)
create policy "Follows viewable by anon"
  on follows for select to anon using (true);

-- Strategies: anon can view public strategies only
create policy "Public strategies viewable by anon"
  on strategies for select to anon using (is_public = true);

-- Backtest results: anon can view results for public strategies only
create policy "Backtest results viewable by anon"
  on strategy_backtest_results for select to anon
  using (
    exists (
      select 1 from strategies s
      where s.id = strategy_id and s.is_public = true
    )
  );
