'use client';

import SocialSidebar from '@/components/social/SocialSidebar';
import { usePresence } from '@/hooks/usePresence';

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  usePresence();

  return (
    <div className="min-h-screen">
      <SocialSidebar />
      <main>
        <div className="max-w-[760px] mx-auto border-x border-border min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
