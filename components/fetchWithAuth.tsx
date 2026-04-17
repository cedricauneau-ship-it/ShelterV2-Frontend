import { store } from '../store';
import { updateTokens, signout } from '../reducers/user';
import { useNavigation } from '@react-navigation/native';
import { DEPLOYED_BACKEND_ADDRESS } from "../modules/global";

const API_URL = DEPLOYED_BACKEND_ADDRESS;

// ─── Refresh atomique ─────────────────────────────────────────────────────────
let refreshPromise: Promise<boolean> | null = null;

const doRefresh = async (oldRefreshToken: string): Promise<boolean> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: oldRefreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      const tokens = data?.tokens;
      if (!tokens?.accessToken) return false;

      store.dispatch(updateTokens({
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? oldRefreshToken,
      }));
      return true;

    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

let isSigningOut = false;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useFetchWithAuth = () => {
  const navigation = useNavigation();

  const fetchWithAuth = async (endpoint: string, options: any = {}): Promise<Response> => {
    try {
      const state = store.getState();
      const { token: accessToken, refreshToken } = state.user.value;

      if (!accessToken || !refreshToken) {
        if (!isSigningOut) {
          isSigningOut = true;
          navigation.navigate('Connexion', { screen: 'ConnexionScreen' });
          setTimeout(() => { isSigningOut = false; }, 3000);
        }
        return new Response(JSON.stringify({ error: 'No tokens' }), { status: 401 });
      }

      let response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
      });

      if (response.status === 401) {
        const refreshed = await doRefresh(refreshToken);

        if (!refreshed) {
          if (!isSigningOut) {
            isSigningOut = true;
            store.dispatch(signout());
            navigation.navigate('Connexion', { screen: 'ConnexionScreen' });
            setTimeout(() => { isSigningOut = false; }, 3000);
          }
          return new Response(JSON.stringify({ error: 'Session expirée' }), { status: 401 });
        }

        const newToken = store.getState().user.value.token;
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: { Authorization: `Bearer ${newToken}`, ...options.headers },
        });
      }

      return response;

    } catch (error) {
      if (__DEV__) console.error('fetchWithAuth error:', error);
      throw error;
    }
  };

  return fetchWithAuth;
};
