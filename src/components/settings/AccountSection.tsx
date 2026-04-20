'use client';

import { createClient } from '@/utils/supabase/client';

export default function AccountSection() {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <div>
        <h3 className="text-xxs font-mono text-text-muted uppercase tracking-wider mb-3">Session</h3>
        <button
          onClick={handleSignOut}
          className="text-xs font-mono text-loss border border-loss/30 hover:bg-loss/10 px-4 py-1.5 rounded transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
