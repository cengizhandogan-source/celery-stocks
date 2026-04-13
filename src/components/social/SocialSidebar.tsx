'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useChatStore } from '@/stores/chatStore';
import { createClient } from '@/utils/supabase/client';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/social', label: 'Feed', icon: '>' },
  { href: '/social/search', label: 'Search', icon: '?' },
  { href: '/social/messages', label: 'Messages', icon: '@' },
];

export default function SocialSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const unreadDmCount = useChatStore((s) => s.unreadDmCount);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="w-[240px] h-screen fixed top-0 left-0 flex flex-col border-r border-terminal-border bg-terminal-panel z-40">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-terminal-border">
        <Link href="/social" className="flex items-center gap-2 text-sm font-mono font-bold text-up tracking-wider">
          <img src="/celery-logo.png" alt="Celery" className="h-5 w-5" />
          Celery
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = href === '/social'
            ? pathname === '/social'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors ${
                isActive
                  ? 'text-up bg-up/5 border-r-2 border-up'
                  : 'text-text-secondary hover:text-text-primary hover:bg-terminal-hover'
              }`}
            >
              <span className="w-5 text-center text-xs opacity-60">{icon}</span>
              <span>{label}</span>
              {label === 'Messages' && unreadDmCount > 0 && (
                <span className="ml-auto text-xxs font-mono bg-up text-terminal-bg rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadDmCount}
                </span>
              )}
            </Link>
          );
        })}

        {user && profile && (
          <Link
            href={`/social/profile/${user.id}`}
            className={`flex items-center gap-3 px-4 py-2.5 font-mono text-sm transition-colors ${
              pathname.startsWith('/social/profile')
                ? 'text-up bg-up/5 border-r-2 border-up'
                : 'text-text-secondary hover:text-text-primary hover:bg-terminal-hover'
            }`}
          >
            <UserAvatar avatarUrl={profile.avatar_url} size="sm" className="ml-1" />
            <span className="truncate">{profile.display_name}</span>
            {profile.is_verified && <VerifiedBadge size={10} />}
          </Link>
        )}

        <div className="my-2 mx-4 border-t border-terminal-border" />

        <Link
          href="/terminal"
          className="flex items-center gap-3 px-4 py-2.5 font-mono text-sm text-text-muted hover:text-cyan hover:bg-terminal-hover transition-colors"
        >
          <span className="w-5 text-center text-xs opacity-60">#</span>
          <span>Terminal</span>
        </Link>
      </nav>

      {/* User section */}
      <div className="px-4 py-3 border-t border-terminal-border">
        {user && profile ? (
          <div className="flex items-center gap-2">
            <UserAvatar avatarUrl={profile.avatar_url} size="sm" />
            <span className="text-xs font-mono text-text-secondary truncate">
              {profile.display_name}
            </span>
            {profile.is_verified && <VerifiedBadge size={10} />}
            <button
              onClick={handleSignOut}
              className="text-xxs font-mono text-text-muted hover:text-down transition-colors"
            >
              out
            </button>
            <Link
              href="/social/settings"
              className={`ml-auto transition-colors ${
                pathname.startsWith('/social/settings')
                  ? 'text-up'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              <Settings size={14} />
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-mono text-text-muted hover:text-up transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
