'use client';

import SettingsContent from '@/components/settings/SettingsContent';

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-terminal-bg/80 backdrop-blur-sm border-b border-terminal-border">
        <div className="px-4 py-3">
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">Settings</h1>
        </div>
      </div>
      <SettingsContent />
    </div>
  );
}
