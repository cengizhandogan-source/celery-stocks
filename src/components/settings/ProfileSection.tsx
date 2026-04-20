'use client';

import { useState, useEffect } from 'react';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import UserAvatar from '@/components/ui/UserAvatar';

export default function ProfileSection({ userId }: { userId: string }) {
  const { profile, loading, updateProfile } = useSocialProfile(userId);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [link, setLink] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.display_name);
      setUsername(profile.username ?? '');
      setBio(profile.bio);
      setLink(profile.link);
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile({
        display_name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
        link: link.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('Username is already taken');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6 text-xs font-mono text-text-muted">Loading profile...</div>;
  }

  if (!profile) return null;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <UserAvatar avatarUrl={avatarUrl || profile.avatar_url} size="xl" />
        <div className="flex-1">
          <label className="block text-xxs font-mono text-text-muted mb-1 uppercase tracking-wider">Profile Picture URL</label>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="block text-xxs font-mono text-text-muted mb-1 uppercase tracking-wider">Display Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
          placeholder="Display name"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-xxs font-mono text-text-muted mb-1 uppercase tracking-wider">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
          placeholder="username"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xxs font-mono text-text-muted mb-1 uppercase tracking-wider">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none resize-none"
          placeholder="Tell people about yourself"
          rows={3}
        />
      </div>

      {/* Link */}
      <div>
        <label className="block text-xxs font-mono text-text-muted mb-1 uppercase tracking-wider">Link</label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
          placeholder="https://yoursite.com"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xxs font-mono text-profit border border-profit/30 hover:bg-profit/10 px-4 py-1.5 rounded transition-colors disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-xxs font-mono text-profit">Saved</span>}
        {error && <span className="text-xxs font-mono text-loss">{error}</span>}
      </div>
    </div>
  );
}
