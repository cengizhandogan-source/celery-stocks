'use client';

import { useSocialProfile } from '@/hooks/useSocialProfile';

export default function PrivacySection({ userId }: { userId: string }) {
  const { profile, loading, updateProfile } = useSocialProfile(userId);

  if (loading) {
    return <div className="px-4 py-6 text-xs font-mono text-text-muted">Loading...</div>;
  }

  if (!profile) return null;

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h3 className="text-xxs font-mono text-text-muted uppercase tracking-wider mb-3">Wallet Visibility</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={profile.show_net_worth ?? false}
              onChange={(e) => updateProfile({ show_net_worth: e.target.checked })}
              className="accent-amber-400"
            />
            <div>
              <span className="text-xs font-mono text-text-primary">Show net worth on profile</span>
              <p className="text-xxs font-mono text-text-muted mt-0.5">Display your total portfolio value on your public profile</p>
            </div>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={profile.show_holdings ?? false}
              onChange={(e) => updateProfile({ show_holdings: e.target.checked })}
              className="accent-amber-400"
            />
            <div>
              <span className="text-xs font-mono text-text-primary">Public holdings</span>
              <p className="text-xxs font-mono text-text-muted mt-0.5">Let other users see your individual asset holdings</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
