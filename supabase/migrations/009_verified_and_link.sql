-- Add verified badge and profile link fields

alter table profiles add column is_verified boolean not null default false;
alter table profiles add column link text default '';

-- Prevent users from self-verifying (admin/service_role retains full access)
revoke update (is_verified) on profiles from authenticated;

-- Seed: mark cengizhan as verified
update profiles set is_verified = true
where id = (select id from auth.users where email = 'cengizhan@collatelabs.com');
