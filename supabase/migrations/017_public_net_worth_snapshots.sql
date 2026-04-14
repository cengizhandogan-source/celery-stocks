-- Allow authenticated users to view other users' net worth snapshots
-- when the target user has opted in to public holdings.
-- Mirrors the "Public holdings viewable when opted in" policy on cached_holdings.

create policy "Public snapshots viewable when opted in"
  on net_worth_snapshots for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = net_worth_snapshots.user_id
        and profiles.show_holdings = true
    )
  );
