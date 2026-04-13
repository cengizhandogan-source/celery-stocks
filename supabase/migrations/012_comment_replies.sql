-- =============================================
-- Comment replies (parent_id self-reference)
-- =============================================

alter table post_comments add column parent_id uuid references post_comments(id) on delete cascade;

create index idx_post_comments_parent on post_comments(parent_id);
