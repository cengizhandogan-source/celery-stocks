'use client';

import { Fragment, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useChatStore } from '@/stores/chatStore';
import { useUiStore } from '@/stores/uiStore';
import { createClient } from '@/utils/supabase/client';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { Home, Search, MessageCircle, Settings, LogOut, Plus, type LucideIcon } from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
];

export default function SocialSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const unreadDmCount = useChatStore((s) => s.unreadDmCount);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          aria-hidden
        />
      )}
      <aside
        className={`w-[240px] h-[100dvh] fixed top-0 left-0 flex flex-col bg-base z-40 transition-transform duration-200 ease-[var(--ease-snap)] md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Logo */}
      <div className="h-[56px] flex items-center px-5 border-b border-border">
        <Link href="/" className="flex items-center">
          <Image
            src="/coinly-text.webp"
            alt="Coinly"
            width={192}
            height={108}
            priority
            className="h-9 w-auto"
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 border-r border-border">
        {NAV_ITEMS.filter(({ label }) => label !== 'Messages' || user).map(({ href, label, icon: Icon }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href);

          return (
            <Fragment key={href}>
              {label === 'Search' && user && (
                <Link
                  href="/?compose=1"
                  className="flex items-center gap-3 px-5 py-3 md:py-2.5 font-sans text-sm text-text-secondary hover:text-text-primary hover:bg-hover transition-all duration-150 ease-[var(--ease-snap)]"
                >
                  <Plus size={18} strokeWidth={1.75} />
                  <span>Post</span>
                </Link>
              )}
              <Link
                href={href}
                className={`relative flex items-center gap-3 px-5 py-3 md:py-2.5 font-sans text-sm transition-all duration-150 ease-[var(--ease-snap)] ${
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
              href={`/profile/${user.id}`}
            className={`relative flex items-center gap-3 px-5 py-3 md:py-2.5 font-sans text-sm transition-all duration-150 ease-[var(--ease-snap)] ${
              pathname.startsWith('/profile')
                ? 'text-gold bg-gold/5'
                : 'text-text-secondary hover:text-text-primary hover:bg-hover'
            }`}
          >
            {pathname.startsWith('/profile') && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-gold" aria-hidden />
            )}
            <UserAvatar avatarUrl={profile.avatar_url} size="xs" />
            <span className="truncate text-text-primary">@{profile.username}</span>
            {profile.is_verified && <VerifiedBadge size={13} />}
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-4 py-3 border-t border-r border-border">
        {user ? (
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/settings"
              className={`p-2 -m-2 transition-colors duration-150 ${
                pathname.startsWith('/settings')
                  ? 'text-gold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              aria-label="Settings"
            >
              <Settings size={15} strokeWidth={1.75} />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 -m-2 text-text-muted hover:text-loss transition-colors duration-150"
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
    </>
  );
}
