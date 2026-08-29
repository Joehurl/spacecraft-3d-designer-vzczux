import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@spacecraft3d_user';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'free' | 'pro';
  joinedAt: string;
  projectCount: number;
  syncEnabled: boolean;
  lastSyncAt: string | null;
}

interface UserContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  login: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  syncProjects: () => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: string | null;
}

const UserContext = createContext<UserContextType | null>(null);

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: UserProfile = JSON.parse(raw);
          setUser(parsed);
          setLastSyncAt(parsed.lastSyncAt);
          console.log('[UserContext] Loaded user from storage:', parsed.email);
        } catch {
          console.log('[UserContext] Failed to parse stored user');
        }
      }
    });
  }, []);

  const persist = useCallback(async (profile: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, []);

  const login = useCallback(async (name: string, email: string) => {
    console.log('[UserContext] login:', email);
    const profile: UserProfile = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatar: getInitials(name),
      plan: 'free',
      joinedAt: new Date().toISOString(),
      projectCount: 0,
      syncEnabled: true,
      lastSyncAt: null,
    };
    await persist(profile);
    setUser(profile);
    setLastSyncAt(null);
  }, [persist]);

  const logout = useCallback(async () => {
    console.log('[UserContext] logout');
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setLastSyncAt(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    console.log('[UserContext] updateProfile:', Object.keys(updates).join(', '));
    const updated = { ...user, ...updates };
    await persist(updated);
    setUser(updated);
  }, [user, persist]);

  const syncProjects = useCallback(async () => {
    if (isSyncing) return;
    console.log('[UserContext] syncProjects: start');
    setIsSyncing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const now = new Date().toISOString();
    setLastSyncAt(now);
    setIsSyncing(false);
    console.log('[UserContext] syncProjects: complete at', now);
    if (user) {
      const updated = { ...user, lastSyncAt: now };
      await persist(updated);
      setUser(updated);
    }
  }, [isSyncing, user, persist]);

  return (
    <UserContext.Provider
      value={{
        user,
        isLoggedIn: user !== null,
        login,
        logout,
        updateProfile,
        syncProjects,
        isSyncing,
        lastSyncAt,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
