'use client';

import AuthGateProvider from '@/components/auth/AuthGateProvider';
import SocialSidebar from '@/components/social/SocialSidebar';
import { usePresence } from '@/hooks/usePresence';

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  usePresence();

  return (
    <AuthGateProvider>
      <div className="min-h-screen">
        <SocialSidebar />
        <main>
          <div className="max-w-[760px] mx-auto min-h-screen px-3 py-2">
            {children}
          </div>
        </main>
      </div>
    </AuthGateProvider>
  );
}
