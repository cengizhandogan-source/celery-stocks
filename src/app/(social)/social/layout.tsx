'use client';

import SocialSidebar from '@/components/social/SocialSidebar';
import { usePresence } from '@/hooks/usePresence';

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  usePresence();

  return (
    <div className="min-h-screen">
      <SocialSidebar />
      <main>
        <div className="max-w-[760px] mx-auto min-h-screen px-3 py-2">
          {children}
        </div>
      </main>
    </div>
  );
}
