-- =============================================
-- Fix "Database error saving new user" on signup
-- =============================================
-- Harden handle_new_user() with explicit search_path and
-- fully-qualified table references so the trigger reliably
-- resolves public.profiles regardless of caller search_path.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_name text;
  candidate text;
  attempts int := 0;
begin
  base_name := lower(split_part(coalesce(new.email, ''), '@', 1));
  if base_name is null or base_name = '' then
    base_name := 'user';
  end if;

  candidate := base_name || floor(random() * 9000 + 1000)::int;

  while exists (select 1 from public.profiles where username = candidate) and attempts < 10 loop
    candidate := base_name || floor(random() * 9000 + 1000)::int;
    attempts := attempts + 1;
  end loop;

  if exists (select 1 from public.profiles where username = candidate) then
    candidate := base_name || replace(gen_random_uuid()::text, '-', '');
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'user'),
    candidate
  );
  return new;
end;
$$;
