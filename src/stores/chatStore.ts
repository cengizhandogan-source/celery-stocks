import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { Profile } from '@/lib/types';

const PROFILE_SELECT = 'id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth';
const inflightProfiles = new Map<string, Promise<Profile | null>>();

interface ChatState {
  onlineUserIds: Set<string>;
  unreadDmCount: number;
  profiles: Map<string, Profile>;
  setOnlineUsers: (ids: string[]) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  cacheProfile: (profile: Profile) => void;
  cacheProfiles: (profiles: Profile[]) => void;
  getProfile: (id: string) => Profile | undefined;
  fetchProfile: (id: string) => Promise<Profile | null>;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  onlineUserIds: new Set(),
  unreadDmCount: 0,
  profiles: new Map(),

  setOnlineUsers: (ids) => set({ onlineUserIds: new Set(ids) }),

  incrementUnread: () => set((s) => ({ unreadDmCount: s.unreadDmCount + 1 })),

  resetUnread: () => set({ unreadDmCount: 0 }),

  cacheProfile: (profile) =>
    set((s) => {
      const next = new Map(s.profiles);
      next.set(profile.id, profile);
      return { profiles: next };
    }),

  cacheProfiles: (profiles) =>
    set((s) => {
      const next = new Map(s.profiles);
      for (const p of profiles) next.set(p.id, p);
      return { profiles: next };
    }),

  getProfile: (id) => get().profiles.get(id),

  fetchProfile: (id) => {
    const cached = get().profiles.get(id);
    if (cached) return Promise.resolve(cached);

    const existing = inflightProfiles.get(id);
    if (existing) return existing;

    const promise = (async (): Promise<Profile | null> => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('profiles')
          .select(PROFILE_SELECT)
          .eq('id', id)
          .single();
        if (data) {
          set((s) => {
            const next = new Map(s.profiles);
            next.set(id, data as Profile);
            return { profiles: next };
          });
          return data as Profile;
        }
        return null;
      } catch {
        return null;
      } finally {
        inflightProfiles.delete(id);
      }
    })();

    inflightProfiles.set(id, promise);
    return promise;
  },
}));

export const MESSAGES_PAGE_SIZE = 50;
