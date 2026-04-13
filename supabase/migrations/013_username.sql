-- =============================================
-- Add unique username to profiles
-- =============================================

-- 1. Add column (nullable initially to backfill)
alter table profiles add column username text;

-- 2. Backfill existing rows: lowercase email-prefix + random suffix
update profiles
set username = lower(display_name) || floor(random() * 9000 + 1000)::int
where username is null;

-- 3. Make not-null and unique
alter table profiles alter column username set not null;
create unique index idx_profiles_username on profiles(username);

-- 4. Update the auto-create trigger to include username
create or replace function handle_new_user()
returns trigger as $$
declare
  base_name text;
  candidate text;
begin
  base_name := lower(split_part(new.email, '@', 1));
  candidate := base_name || floor(random() * 9000 + 1000)::int;

  -- Ensure uniqueness
  while exists (select 1 from profiles where username = candidate) loop
    candidate := base_name || floor(random() * 9000 + 1000)::int;
  end loop;

  insert into profiles (id, display_name, username)
  values (new.id, split_part(new.email, '@', 1), candidate);
  return new;
end;
$$ language plpgsql security definer;
