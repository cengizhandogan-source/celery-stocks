'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Send } from 'lucide-react';
import UserSearchInput from '@/components/chat/UserSearchInput';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import PostChip from './PostChip';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useAuthGate } from '@/hooks/useAuthGate';
import type { Post, Profile } from '@/lib/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coinly.club';

function buildShareText(post: Post, shareUrl: string): string {
  const symbol = post.trade_symbol ?? post.position_symbol ?? post.symbol;
  const cashtag = symbol ? `$${symbol.toUpperCase()}` : null;
  const author = post.profile?.username ? `@${post.profile.username}` : null;

  let hook: string;
  if (post.post_type === 'trade' && cashtag) {
    const verb = post.trade_side === 'sell' ? 'sell' : 'buy';
    hook = `Check out this ${cashtag} ${verb} on Coinly`;
  } else if (post.post_type === 'position' && cashtag) {
    hook = `Check out this ${cashtag} position on Coinly`;
  } else if (cashtag) {
    hook = `Check out this ${cashtag} post on Coinly`;
  } else if (author) {
    hook = `Check out ${author}'s post on Coinly`;
  } else {
    hook = 'Check out this post on Coinly';
  }

  return `${hook} — the social feed for crypto and stock traders.\nJoin at https://coinly.club\n\n${shareUrl}`;
}

export default function SharePostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const shareUrl = `${SITE_URL}/post/${post.id}`;
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(post, shareUrl));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable; leave button in idle state so user can retry.
    }
  }, [post, shareUrl]);

  const handleSend = useCallback(async () => {
    if (!recipient) return;
    if (!requireAuth('send this post')) return;
    if (!user) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: recipient.id,
      content: message.trim() || null,
      post_id: post.id,
    });
    setSending(false);
    if (!error) {
      setSentTo(recipient.username);
      setRecipient(null);
      setMessage('');
      setTimeout(() => {
        setSentTo(null);
        onClose();
      }, 1200);
    }
  }, [recipient, message, user, post.id, requireAuth, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share post"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-20"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] bg-surface border border-border rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">
            Share post
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Copy link */}
        <div className="px-4 py-3 border-b border-border">
          <label className="block text-xxs font-mono text-text-muted uppercase tracking-wider mb-1.5">
            Copy link
          </label>
          <button
            onClick={handleCopy}
            className={`w-full flex items-center justify-center gap-1.5 text-xxs font-mono px-3 py-2 rounded border transition-colors ${
              copied
                ? 'text-profit border-profit/40 bg-profit/10'
                : 'text-text-primary border-border hover:bg-hover'
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Send in DM */}
        <div className="px-4 py-3">
          <label className="block text-xxs font-mono text-text-muted uppercase tracking-wider mb-1.5">
            Send in DM
          </label>

          {sentTo ? (
            <p className="text-xs font-mono text-profit py-2">
              Sent to @{sentTo}
            </p>
          ) : recipient ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-border bg-base/50 mb-2">
              <UserAvatar avatarUrl={recipient.avatar_url} size="sm" />
              <span className="text-xs font-mono font-medium truncate text-text-primary">
                @{recipient.username}
              </span>
              {recipient.is_verified && <VerifiedBadge size={12} />}
              <button
                onClick={() => setRecipient(null)}
                className="ml-auto text-text-muted hover:text-text-primary transition-colors"
                aria-label="Clear recipient"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="-mx-3 mb-2">
              <UserSearchInput onSelect={setRecipient} />
            </div>
          )}

          {recipient && !sentTo && (
            <>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message (optional)"
                rows={2}
                className="w-full bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none resize-none"
              />
              <div className="mt-2">
                <PostChip post={post} />
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="mt-3 w-full flex items-center justify-center gap-1.5 text-xxs font-mono px-3 py-1.5 rounded border border-profit/30 text-profit hover:bg-profit/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={12} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
