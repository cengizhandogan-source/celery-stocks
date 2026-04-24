'use client';

import SettingsContent from '@/components/settings/SettingsContent';
import SocialTopBar from '@/components/social/SocialTopBar';

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <SocialTopBar title="Settings" />
      <SettingsContent />
    </div>
  );
}
