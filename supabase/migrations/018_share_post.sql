-- =============================================
-- Share Post: allow attaching a post to a DM
-- =============================================

alter table direct_messages
  add column post_id uuid references posts(id) on delete set null;

create index idx_dm_post on direct_messages(post_id);

-- Make content optional so a DM can be a post-only share.
alter table direct_messages alter column content drop not null;

alter table direct_messages
  add constraint dm_has_payload check (
    (content is not null and length(btrim(content)) > 0)
    or strategy_id is not null
    or post_id is not null
  );
