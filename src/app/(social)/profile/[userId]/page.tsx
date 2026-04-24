'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useFollow } from '@/hooks/useFollow';
import { useFeed } from '@/hooks/useFeed';
import PostCard from '@/components/feed/PostCard';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import NetWorthBadge from '@/components/ui/NetWorthBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import HoldingsTable from '@/components/wallet/HoldingsTable';
import SocialTopBar from '@/components/social/SocialTopBar';

const NetWorthChart = dynamic(() => import('@/components/wallet/NetWorthChart'), {
  ssr: false,
  loading: () => <div className="w-full h-[100px] rounded bg-hover/30 animate-pulse" />,
});
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import { useAuthGate } from '@/hooks/useAuthGate';
import { formatNetWorth } from '@/lib/formatters';

function WalletHoldingsSection({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const { holdings, totalNetWorth, loading } = useCryptoHoldings(userId);
  const { snapshots } = useNetWorthHistory(userId);

  if (loading) {
    return (
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xxs font-mono text-text-muted">Loading holdings...</p>
      </div>
    );
  }

  if (holdings.length === 0 && !isOwnProfile) return null;

  return (
    <div className="px-4 py-4 border-b border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-mono font-bold text-text-primary">Wallet Holdings</h2>
        <span className="text-base font-mono text-gold font-bold">{formatNetWorth(totalNetWorth)}</span>
      </div>
      {snapshots.length >= 2 && (
        <div className="mb-3">
          <NetWorthChart snapshots={snapshots} currentValue={totalNetWorth} />
        </div>
      )}
      {holdings.length > 0 ? (
        <HoldingsTable holdings={holdings} totalNetWorth={totalNetWorth} />
      ) : (
        <p className="text-xxs font-mono text-text-muted">No holdings to display</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useUser();
  const { profile, loading: profileLoading, updateProfile } = useSocialProfile(userId);
  const { isFollowing, loading: followLoading, toggleFollow } = useFollow(userId);
  const { requireAuth } = useAuthGate();
  const { posts, loading: postsLoading, loadingMore, hasMore, loadMore, setFilters, toggleLike, toggleTopCommentLike, deletePost } = useFeed();
  const isOwnProfile = user?.id === userId;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Set userId filter on mount
  useEffect(() => {
    setFilters((prev) => ({ ...prev, userId }));
  }, [userId, setFilters]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
        User not found
      </div>
    );
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col">
      <SocialTopBar title={isOwnProfile ? 'Profile' : `@${profile.username}`} />
      {/* Profile header */}
      <div className="px-4 py-6 border-b border-border">
        <div className="flex items-start gap-3">
          <UserAvatar avatarUrl={profile.avatar_url} size="xl" />
          <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-mono font-bold truncate text-text-primary">
                    {profile.display_name}
                  </h1>
                  {profile.is_verified && <VerifiedBadge size={16} />}
                  <NetWorthBadge netWorth={profile.crypto_net_worth} showNetWorth={profile.show_net_worth} />
                  {!isOwnProfile && (
                    <button
                      onClick={() => { if (requireAuth('follow this user')) toggleFollow(); }}
                      disabled={followLoading}
                      className={`text-xxs font-mono px-3 py-0.5 rounded border transition-colors ${
                        isFollowing
                          ? 'text-text-muted border-border hover:border-loss/40 hover:text-loss'
                          : 'text-profit border-profit/30 hover:bg-profit/10'
                      }`}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p className="text-xs font-mono text-text-secondary mt-1 leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                {profile.link && (
                  <a
                    href={profile.link.startsWith('http') ? profile.link : `https://${profile.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-info hover:underline mt-1 block truncate"
                  >
                    {profile.link}
                  </a>
                )}
                <p className="text-xxs font-mono text-text-muted mt-2">
                  Joined {joinDate}
                </p>
                <div className="flex gap-4 mt-3">
                  <span className="text-xs font-mono">
                    <span className="text-text-primary font-bold">{profile.post_count}</span>
                    <span className="text-text-muted ml-1">Posts</span>
                  </span>
                  <span className="text-xs font-mono">
                    <span className="text-text-primary font-bold">{profile.follower_count}</span>
                    <span className="text-text-muted ml-1">Followers</span>
                  </span>
                  <span className="text-xs font-mono">
                    <span className="text-text-primary font-bold">{profile.following_count}</span>
                    <span className="text-text-muted ml-1">Following</span>
                  </span>
                  {profile.crypto_net_worth != null && profile.show_net_worth && (
                    <span className="text-xs font-mono">
                      <span className="text-gold font-bold">{formatNetWorth(profile.crypto_net_worth)}</span>
                      <span className="text-text-muted ml-1">Net Worth</span>
                    </span>
                  )}
                </div>

          </div>
        </div>
      </div>

      {/* Holdings section */}
      {profile.crypto_net_worth != null && (isOwnProfile || profile.show_holdings) && (
        <WalletHoldingsSection userId={userId} isOwnProfile={isOwnProfile} />
      )}

      {/* Posts */}
      {postsLoading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          Loading posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          No posts yet
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} onToggleTopCommentLike={toggleTopCommentLike} onDelete={deletePost} currentUserId={user?.id} />
          ))}
          {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden />}
          {loadingMore && (
            <div className="flex items-center justify-center py-4 text-text-muted text-xs font-mono">
              Loading more…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
