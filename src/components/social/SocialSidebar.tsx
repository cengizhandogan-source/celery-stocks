'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useChatStore } from '@/stores/chatStore';
import { createClient } from '@/utils/supabase/client';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { Home, Search, MessageCircle, Settings, LogOut, type LucideIcon } from 'lucide-react';

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
    <aside className="w-[240px] h-screen fixed top-0 left-0 flex flex-col border-r border-border bg-surface z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link
          href="/social"
          className="flex items-center gap-2.5 text-[15px] font-sans font-semibold text-gold tracking-tight"
        >
          <img src="/coinly-logo.png" alt="Coinly" className="h-6 w-6" />
          Coinly
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.filter(({ label }) => label !== 'Messages' || user).map(({ href, label, icon: Icon }) => {
          const isActive = href === '/social'
            ? pathname === '/social'
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
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
          );
        })}

        {user && profile && (
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
            <span className="truncate">{profile.display_name}</span>
            {profile.is_verified && <VerifiedBadge size={11} pulse={false} />}
          </Link>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-3 border-t border-border">
        {user && profile ? (
          <div className="flex items-center gap-2">
            <UserAvatar avatarUrl={profile.avatar_url} size="sm" />
            <span className="text-xs font-sans font-medium text-text-primary truncate">
              {profile.display_name}
            </span>
            {profile.is_verified && <VerifiedBadge size={11} pulse={false} />}
            <Link
              href="/social/settings"
              className={`ml-auto transition-colors duration-150 ${
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
