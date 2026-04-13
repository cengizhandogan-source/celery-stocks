'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
          <span key={i} className="text-cyan font-medium">{part}</span>
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
  onAuthGate,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onReply: (comment: Comment) => void;
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

  return (
    <div className="group flex items-start gap-1.5 py-1.5 px-2 hover:bg-terminal-hover/50 rounded transition-colors">
      <UserAvatar avatarUrl={comment.profile?.avatar_url} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-xxs font-mono font-medium truncate"
            style={{ color: comment.profile?.avatar_color ?? '#888888' }}
          >
            {comment.profile?.display_name ?? 'Unknown'}
          </span>
          {comment.profile?.is_verified && <VerifiedBadge size={10} />}
          <NetWorthBadge netWorth={comment.profile?.crypto_net_worth} showNetWorth={comment.profile?.show_net_worth} />
          <span className="text-xxs font-mono text-text-muted">{timeStr}</span>

          {/* Reply button */}
          <button
            onClick={() => {
              if (!currentUserId) { onAuthGate?.(); return; }
              onReply(comment);
            }}
            className="text-xxs font-mono text-text-muted hover:text-cyan transition-colors px-1 leading-none opacity-0 group-hover:opacity-100"
          >
            reply
          </button>

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
                    className="fixed z-50 min-w-[100px] py-1 rounded border border-terminal-border bg-terminal-bg shadow-lg"
                    style={{ top: rect.bottom + 4, left: rect.right - 100 }}
                  >
                    <button
                      onClick={() => { onDelete(comment.id); setMenuOpen(false); }}
                      className="w-full text-left text-xxs font-mono px-3 py-1.5 text-down hover:bg-down/10 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {parentUsername && (
          <span className="text-xxs font-mono text-text-muted">
            ↳{' '}
            <span style={{ color: comment.parent?.profile?.avatar_color ?? '#888' }}>
              @{parentUsername}
            </span>
          </span>
        )}

        <CommentContent content={comment.content} />
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
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-terminal-panel border border-terminal-border-strong rounded shadow-2xl z-50 max-h-36 overflow-y-auto">
      {results.map((p) => (
        <button
          key={p.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(p); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-terminal-hover transition-colors"
        >
          <UserAvatar avatarUrl={p.avatar_url} size="xs" />
          <span className="text-xxs font-mono text-text-muted">@{p.username}</span>
          <span className="text-xxs font-mono" style={{ color: p.avatar_color }}>
            {p.display_name}
          </span>
          {p.is_verified && <VerifiedBadge size={10} />}
          <NetWorthBadge netWorth={p.crypto_net_worth} showNetWorth={p.show_net_worth} />
        </button>
      ))}
    </div>
  );
}

export default function CommentSection({
  postId,
  currentUserId,
}: {
  postId: string;
  currentUserId?: string;
}) {
  const { requireAuth } = useAuthGate();
  const { comments, loading, addComment, deleteComment } = useComments(postId);
  const { results: mentionResults, search: mentionSearch, clear: mentionClear } = useUserSearch();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mentionTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
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

  // Detect @mention trigger in input
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);

      // Find the last @ that isn't followed by a space yet (active mention query)
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
      // Replace the @query with @username
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
    await addComment(text, parentId);
  };

  return (
    <div className="border-t border-terminal-border/50 ml-3 border-l-2 border-l-terminal-border/30">
      {/* Comment list */}
      <div ref={listRef} className="max-h-60 overflow-y-auto">
        {loading && comments.length === 0 && (
          <div className="px-3 py-2 text-xxs font-mono text-text-muted">Loading...</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="px-3 py-2 text-xxs font-mono text-text-muted">No comments yet</div>
        )}
        {comments.map((c) => (
          <CommentRow
            key={c.id}
            comment={c}
            currentUserId={currentUserId}
            onDelete={deleteComment}
            onReply={handleReply}
            onAuthGate={() => requireAuth('reply to comments')}
          />
        ))}
      </div>

      {/* Comment input */}
      {currentUserId ? (
        <div className="relative px-2 py-1.5 border-t border-terminal-border/30">
          {/* Reply indicator */}
          {replyTo && (
            <div className="flex items-center gap-1.5 px-2 pb-1">
              <span className="text-xxs font-mono text-text-muted">
                replying to <span className="text-cyan">@{replyTo.username}</span>
              </span>
              <button
                onClick={cancelReply}
                className="text-xxs font-mono text-text-muted hover:text-down transition-colors leading-none"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mention autocomplete */}
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
            className="w-full bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-cyan/40 focus:outline-none transition-colors"
          />
        </div>
      ) : (
        <div className="px-2 py-1.5 border-t border-terminal-border/30">
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
