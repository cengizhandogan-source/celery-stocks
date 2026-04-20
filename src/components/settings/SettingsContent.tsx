'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import ProfileSection from './ProfileSection';
import WalletsSection from './WalletsSection';
import PrivacySection from './PrivacySection';
import AccountSection from './AccountSection';

const TABS = ['Profile', 'Wallets', 'Privacy', 'Account'] as const;
type Tab = (typeof TABS)[number];

export default function SettingsContent() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('Profile');

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
        Sign in to access settings
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab navigation */}
      <div className="px-4 py-2 border-b border-border shrink-0 flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xxs font-mono px-2.5 py-1 rounded border transition-colors ${
              activeTab === tab
                ? 'border-profit/50 bg-profit/10 text-profit'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-hover'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'Profile' && <ProfileSection userId={user.id} />}
        {activeTab === 'Wallets' && <WalletsSection />}
        {activeTab === 'Privacy' && <PrivacySection userId={user.id} />}
        {activeTab === 'Account' && <AccountSection />}
      </div>
    </div>
  );
}
