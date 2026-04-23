'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useChatStore } from '@/stores/chatStore';
import { createClient } from '@/utils/supabase/client';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { Home, Search, MessageCircle, Settings, LogOut, Plus, type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/social', label: 'Feed', icon: Home },
  { href: '/social/search', label: 'Search', icon: Search },
  { href: '/social/messages', label: 'Messages', icon: MessageCircle },
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
    <aside className="w-[240px] h-screen fixed top-0 left-0 flex flex-col border-r border-border bg-base z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link
          href="/social"
          className="flex items-center gap-2.5 text-[17px] font-sans font-semibold text-gold tracking-tight"
        >
          <img src="/coinly-logo.png" alt="Coinly" className="h-8 w-8" />
          Coinly
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        <div className="px-5 pt-2 pb-1 text-[10px] font-sans uppercase tracking-wider text-text-muted">
          Browse
        </div>
        {NAV_ITEMS.filter(({ label }) => label !== 'Messages' || user).map(({ href, label, icon: Icon }) => {
          const isActive = href === '/social'
            ? pathname === '/social'
            : pathname.startsWith(href);

          return (
            <Fragment key={href}>
              {label === 'Search' && user && (
                <Link
                  href="/social?compose=1"
                  className="flex items-center gap-3 px-5 py-2.5 font-sans text-sm text-text-secondary hover:text-text-primary hover:bg-hover transition-all duration-150 ease-[var(--ease-snap)]"
                >
                  <Plus size={18} strokeWidth={1.75} />
                  <span>Post</span>
                </Link>
              )}
              <Link
                href={href}
                className={`relative flex items-center gap-3 px-5 py-2.5 font-sans text-sm transition-all duration-150 ease-[var(--ease-snap)] ${
                  isActive
                    ? 'text-gold bg-gold/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-hover'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-gold" aria-hidden />
                )}
                <Icon size={18} strokeWidth={1.75} />
                <span>{label}</span>
                {label === 'Messages' && unreadDmCount > 0 && (
                  <span className="ml-auto text-[10px] font-mono font-semibold bg-gold text-base rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {unreadDmCount}
                  </span>
                )}
              </Link>
            </Fragment>
          );
        })}

        {user && profile && (
          <>
            <div className="px-5 pt-4 pb-1 text-[10px] font-sans uppercase tracking-wider text-text-muted">
              You
            </div>
            <Link
              href={`/social/profile/${user.id}`}
            className={`relative flex items-center gap-3 px-5 py-2.5 font-sans text-sm transition-all duration-150 ease-[var(--ease-snap)] ${
              pathname.startsWith('/social/profile')
                ? 'text-gold bg-gold/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-hover'
            }`}
          >
            {pathname.startsWith('/social/profile') && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-gold" aria-hidden />
            )}
            <UserAvatar avatarUrl={profile.avatar_url} size="xs" />
            <span className="truncate text-text-primary">@{profile.username}</span>
            {profile.is_verified && <VerifiedBadge size={13} pulse={false} />}
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-3 border-t border-border">
        {user ? (
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/social/settings"
              className={`transition-colors duration-150 ${
                pathname.startsWith('/social/settings')
                  ? 'text-gold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-label="Settings"
            >
              <Settings size={15} strokeWidth={1.75} />
            </Link>
            <button
              onClick={handleSignOut}
              className="text-text-muted hover:text-loss transition-colors duration-150"
              aria-label="Sign out"
            >
              <LogOut size={15} strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-sans text-text-muted hover:text-gold transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
