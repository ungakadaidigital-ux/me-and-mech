import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  workshopId: string | null;
  subscriptionStatus: string | null;
  hydrated: boolean;
  setSession: (params: { accessToken: string; refreshToken: string; workshopId: string; subscriptionStatus: string }) => Promise<void>;
  updateAccessToken: (accessToken: string, subscriptionStatus?: string) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
}

const KEYS = { access: 'me_mech_access_token', refresh: 'me_mech_refresh_token', workshop: 'me_mech_workshop_id', sub: 'me_mech_subscription_status' };

/**
 * PKG-039. SecureStore (Android Keystore-backed) rather than AsyncStorage
 * for tokens specifically — AsyncStorage is unencrypted, fine for cached
 * API data (see offline/db.ts) but not for auth secrets.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  workshopId: null,
  subscriptionStatus: null,
  hydrated: false,

  setSession: async ({ accessToken, refreshToken, workshopId, subscriptionStatus }) => {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.access, accessToken),
      SecureStore.setItemAsync(KEYS.refresh, refreshToken),
      SecureStore.setItemAsync(KEYS.workshop, workshopId),
      SecureStore.setItemAsync(KEYS.sub, subscriptionStatus),
    ]);
    set({ accessToken, refreshToken, workshopId, subscriptionStatus });
  },

  updateAccessToken: async (accessToken, subscriptionStatus) => {
    await SecureStore.setItemAsync(KEYS.access, accessToken);
    if (subscriptionStatus) await SecureStore.setItemAsync(KEYS.sub, subscriptionStatus);
    set((state) => ({ accessToken, subscriptionStatus: subscriptionStatus ?? state.subscriptionStatus }));
  },

  clearSession: async () => {
    await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
    set({ accessToken: null, refreshToken: null, workshopId: null, subscriptionStatus: null });
  },

  hydrate: async () => {
    const [accessToken, refreshToken, workshopId, subscriptionStatus] = await Promise.all([
      SecureStore.getItemAsync(KEYS.access),
      SecureStore.getItemAsync(KEYS.refresh),
      SecureStore.getItemAsync(KEYS.workshop),
      SecureStore.getItemAsync(KEYS.sub),
    ]);
    set({ accessToken, refreshToken, workshopId, subscriptionStatus, hydrated: true });
  },
}));
