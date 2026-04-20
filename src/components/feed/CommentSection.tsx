'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useComments } from '@/hooks/useComments';
import { useUserSearch } from '@/hooks/useUserSearch';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import NetWorthBadge from '@/components/ui/NetWorthBadge';
import { useAuthGate } from '@/hooks/useAuthGate';
import type { Comment, Profile } from '@/lib/types';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m`;
  if (diffH < 24) return `${diffH}h`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Render comment content with @mentions highlighted */
function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <p className="text-xxs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-info font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

function CommentRow({
  comment,
  currentUserId,
  onDelete,
  onReply,
  onToggleLike,
  onAuthGate,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onReply: (comment: Comment) => void;
  onToggleLike: (id: string) => void;
  onAuthGate?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isOwner = currentUserId != null && comment.user_id === currentUserId;
  const timeStr = useMemo(() => formatTime(comment.created_at), [comment.created_at]);

  const parentUsername = comment.parent?.profile?.username;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const likeClass = comment.liked_by_me
    ? 'text-text-primary'
    : 'text-text-muted hover:text-text-primary';
  const likeTitle = currentUserId ? (comment.liked_by_me ? 'Unlike' : 'Like') : 'Sign in to like';
  const replyTitle = currentUserId ? 'Reply' : 'Sign in to reply';

  return (
    <div className="group flex items-start gap-1.5 py-1.5 px-2 hover:bg-hover/50 rounded transition-colors">
      <UserAvatar avatarUrl={comment.profile?.avatar_url} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xxs font-mono font-medium truncate text-text-primary">
            {comment.profile?.username ? `@${comment.profile.username}` : 'Unknown'}
          </span>
          {comment.profile?.is_verified && <VerifiedBadge size={12} />}
          <NetWorthBadge netWorth={comment.profile?.crypto_net_worth} showNetWorth={comment.profile?.show_net_worth} />
          <span className="text-xxs font-mono text-text-muted">{timeStr}</span>

          {isOwner && (
            <div className="relative ml-auto shrink-0" ref={menuRef}>
              <button
                ref={btnRef}
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-xxs font-mono text-text-muted hover:text-text-secondary transition-colors px-1 leading-none opacity-0 group-hover:opacity-100"
              >
                &hellip;
              </button>
              {menuOpen && btnRef.current && (() => {
                const rect = btnRef.current!.getBoundingClientRect();
                return (
                  <div
                    className="fixed z-50 min-w-[100px] py-1 rounded border border-border bg-base shadow-lg"
                    style={{ top: rect.bottom + 4, left: rect.right - 100 }}
                  >
                    <button
                      onClick={() => { onDelete(comment.id); setMenuOpen(false); }}
                      className="w-full text-left text-xxs font-mono px-3 py-1.5 text-loss hover:bg-loss/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {parentUsername && (
          <span className="text-xxs font-mono text-text-muted">
            ↳{' '}
            <span className="text-text-primary">
              @{parentUsername}
            </span>
          </span>
        )}

        <CommentContent content={comment.content} />

        <div className="flex items-center gap-2 mt-0.5">
          <button
            type="button"
            title={likeTitle}
            onClick={() => {
              if (!currentUserId) { onAuthGate?.(); return; }
              onToggleLike(comment.id);
            }}
            className={`flex items-center gap-1 text-xxs font-mono transition-colors ${likeClass}`}
          >
            <Heart
              size={12}
              fill={comment.liked_by_me ? 'currentColor' : 'none'}
              strokeWidth={comment.liked_by_me ? 0 : 2}
            />
            {comment.like_count > 0 && <span>{comment.like_count}</span>}
          </button>
          <button
            type="button"
            title={replyTitle}
            onClick={() => {
              if (!currentUserId) { onAuthGate?.(); return; }
              onReply(comment);
            }}
            className="flex items-center gap-1 text-xxs font-mono text-text-muted hover:text-info transition-colors"
          >
            <MessageCircle size={12} />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mention autocomplete dropdown */
function MentionDropdown({
  results,
  onSelect,
}: {
  results: Profile[];
  onSelect: (profile: Profile) => void;
}) {
  if (results.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-border-strong rounded shadow-2xl z-50 max-h-36 overflow-y-auto">
      {results.map((p) => (
        <button
          key={p.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(p); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-hover transition-colors"
        >
          <UserAvatar avatarUrl={p.avatar_url} size="xs" />
          <span className="text-xxs font-mono text-text-primary">@{p.username}</span>
          {p.is_verified && <VerifiedBadge size={12} />}
          <NetWorthBadge netWorth={p.crypto_net_worth} showNetWorth={p.show_net_worth} />
        </button>
      ))}
    </div>
  );
}

/**
 * Group comments into top-level threads. Any descendant (reply, reply-to-reply, …)
 * is gathered under the top-level ancestor it traces back to, sorted chronologically.
 */
function buildThreads(comments: Comment[]): Array<{ top: Comment; descendants: Comment[] }> {
  const byId = new Map<string, Comment>();
  for (const c of comments) byId.set(c.id, c);

  const rootOf = new Map<string, string>();
  function findRoot(id: string): string {
    if (rootOf.has(id)) return rootOf.get(id)!;
    const c = byId.get(id);
    if (!c || !c.parent_id) {
      rootOf.set(id, id);
      return id;
    }
    const root = findRoot(c.parent_id);
    rootOf.set(id, root);
    return root;
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const descendantsByRoot = new Map<string, Comment[]>();
  for (const c of comments) {
    if (!c.parent_id) continue;
    const root = findRoot(c.id);
    if (!byId.has(root)) continue;
    if (!descendantsByRoot.has(root)) descendantsByRoot.set(root, []);
    descendantsByRoot.get(root)!.push(c);
  }
  for (const arr of descendantsByRoot.values()) {
    arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  return topLevel.map((top) => ({
    top,
    descendants: descendantsByRoot.get(top.id) ?? [],
  }));
}

export default function CommentSection({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId?: string;
}) {
  const { requireAuth } = useAuthGate();
  const {
    comments,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    addComment,
    deleteComment,
    toggleCommentLike,
  } = useComments(postId);
  const { results: mentionResults, search: mentionSearch, clear: mentionClear } = useUserSearch();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wasAtBottomRef = useRef(true);
  const prevLenRef = useRef(0);

  const threads = useMemo(() => buildThreads(comments), [comments]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    wasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const grew = comments.length > prevLenRef.current;
    prevLenRef.current = comments.length;
    if (grew && wasAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [comments.length]);

  const handleReply = useCallback((comment: Comment) => {
    const uname = comment.profile?.username ?? 'unknown';
    setReplyTo({ commentId: comment.id, username: uname });
    setInput(`@${uname} `);
    inputRef.current?.focus();
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setInput('');
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);

      const match = value.match(/@(\w*)$/);
      if (match) {
        const query = match[1];
        setMentionQuery(query);
        clearTimeout(mentionTimerRef.current);
        if (query.length >= 1) {
          mentionTimerRef.current = setTimeout(() => mentionSearch(query), 200);
        } else {
          mentionClear();
        }
      } else {
        setMentionQuery(null);
        mentionClear();
      }
    },
    [mentionSearch, mentionClear]
  );

  const handleMentionSelect = useCallback(
    (profile: Profile) => {
      const before = input.replace(/@\w*$/, '');
      setInput(`${before}@${profile.username} `);
      setMentionQuery(null);
      mentionClear();
      inputRef.current?.focus();
    },
    [input, mentionClear]
  );

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    const parentId = replyTo?.commentId;
    setReplyTo(null);
    setMentionQuery(null);
    mentionClear();
    wasAtBottomRef.current = true;
    await addComment(text, parentId);
  };

  return (
    <div className="border-t border-border/50 ml-3 border-l-2 border-l-border/30">
      <div ref={listRef} onScroll={handleScroll} className="max-h-80 overflow-y-auto">
        {loading && comments.length === 0 && (
          <div className="px-3 py-2 text-xxs font-mono text-text-muted">Loading...</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="px-3 py-2 text-xxs font-mono text-text-muted">No comments yet</div>
        )}
        {threads.map(({ top, descendants }) => (
          <div key={top.id}>
            <CommentRow
              comment={top}
              currentUserId={currentUserId}
              onDelete={deleteComment}
              onReply={handleReply}
              onToggleLike={toggleCommentLike}
              onAuthGate={() => requireAuth('interact with comments')}
            />
            {descendants.length > 0 && (
              <div className="ml-4 pl-2 border-l-2 border-l-border/40">
                {descendants.map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    currentUserId={currentUserId}
                    onDelete={deleteComment}
                    onReply={handleReply}
                    onToggleLike={toggleCommentLike}
                    onAuthGate={() => requireAuth('interact with comments')}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full text-xxs font-mono text-text-muted hover:text-text-primary py-1.5 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Show more comments'}
          </button>
        )}
      </div>

      {currentUserId ? (
        <div className="relative px-2 py-1.5 border-t border-border/30">
          {replyTo && (
            <div className="flex items-center gap-1.5 px-2 pb-1">
              <span className="text-xxs font-mono text-text-muted">
                replying to <span className="text-text-primary">@{replyTo.username}</span>
              </span>
              <button
                onClick={cancelReply}
                className="text-xxs font-mono text-text-muted hover:text-loss transition-colors leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {mentionQuery !== null && <MentionDropdown results={mentionResults} onSelect={handleMentionSelect} />}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape' && replyTo) {
                cancelReply();
              }
            }}
            placeholder="Add a comment..."
            className="w-full bg-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-info/40 focus:outline-none transition-colors"
          />
        </div>
      ) : (
        <div className="px-2 py-1.5 border-t border-border/30">
          <button
            onClick={() => requireAuth('leave a comment')}
            className="w-full text-xxs font-mono text-text-muted hover:text-text-secondary py-1.5 text-left px-2 transition-colors"
          >
            Sign in to comment...
          </button>
        </div>
      )}
    </div>
  );
}
