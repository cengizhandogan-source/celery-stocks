import { create } from 'zustand';
import { Profile } from '@/lib/types';

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
}));

export const MESSAGES_PAGE_SIZE = 50;
