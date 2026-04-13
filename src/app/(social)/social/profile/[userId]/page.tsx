'use client';

import { useEffect } from 'react';
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
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useAuthGate } from '@/hooks/useAuthGate';
import { formatNetWorth } from '@/lib/formatters';

function WalletHoldingsSection({ userId, isOwnProfile }: { userId: string; isOwnProfile: boolean }) {
  const { holdings, totalNetWorth, loading } = useCryptoHoldings(userId);

  if (loading) {
    return (
      <div className="px-4 py-4 border-b border-terminal-border">
        <p className="text-xxs font-mono text-text-muted">Loading holdings...</p>
      </div>
    );
  }

  if (holdings.length === 0 && !isOwnProfile) return null;

  return (
    <div className="px-4 py-4 border-b border-terminal-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold text-text-primary">Wallet Holdings</h2>
        <span className="text-xs font-mono text-amber-400 font-bold">{formatNetWorth(totalNetWorth)}</span>
      </div>
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
  const { posts, loading: postsLoading, filters, setFilters, toggleLike, deletePost } = useFeed();
  const isOwnProfile = user?.id === userId;

  // Set userId filter on mount
  useEffect(() => {
    setFilters((prev) => ({ ...prev, userId }));
  }, [userId, setFilters]);

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
      {/* Profile header */}
      <div className="px-4 py-6 border-b border-terminal-border">
        <div className="flex items-start gap-3">
          <UserAvatar avatarUrl={profile.avatar_url} size="xl" />
          <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1
                    className="text-base font-mono font-bold truncate"
                    style={{ color: profile.avatar_color }}
                  >
                    {profile.display_name}
                  </h1>
                  {profile.is_verified && <VerifiedBadge size={14} />}
                  <NetWorthBadge netWorth={profile.crypto_net_worth} showNetWorth={profile.show_net_worth} />
                  {!isOwnProfile && (
                    <button
                      onClick={() => { if (requireAuth('follow this user')) toggleFollow(); }}
                      disabled={followLoading}
                      className={`text-xxs font-mono px-3 py-0.5 rounded border transition-colors ${
                        isFollowing
                          ? 'text-text-muted border-terminal-border hover:border-down/40 hover:text-down'
                          : 'text-up border-up/30 hover:bg-up/10'
                      }`}
                    >
                      {isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
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
                    className="text-xs font-mono text-cyan hover:underline mt-1 block truncate"
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
                      <span className="text-amber-400 font-bold">{formatNetWorth(profile.crypto_net_worth)}</span>
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
        posts.map((post) => (
          <PostCard key={post.id} post={post} onToggleLike={toggleLike} onDelete={deletePost} currentUserId={user?.id} />
        ))
      )}
    </div>
  );
}
