// Login with Keycloak (authorization code + PKCE). Keycloak is served under /auth on the same
// origin. If it cannot be reached, the app keeps working for guests.
import Keycloak from './vendor/keycloak.js';

const keycloak = new Keycloak({
  url: `${location.origin}/auth`,
  realm: 'framingham',
  clientId: 'framingham-frontend',
});

const listeners = [];
let available = false;

function notify() {
  listeners.forEach(listener => listener());
}

keycloak.onAuthLogout = notify;
keycloak.onTokenExpired = () => keycloak.updateToken(30).catch(() => keycloak.clearToken());

/** Checks for an existing Keycloak session without redirecting. Resolves to false if Keycloak is down. */
export async function initAuth() {
  try {
    await keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,
    });
    available = true;
  } catch (error) {
    console.warn('Keycloak is not reachable, continuing as guest.', error);
  }
  notify();
  return available;
}

/** Called whenever the login state may have changed. */
export function onAuthChange(listener) {
  listeners.push(listener);
}

export const isAuthAvailable = () => available;
export const isLoggedIn = () => available && keycloak.authenticated === true;

export function userName() {
  const token = keycloak.tokenParsed ?? {};
  return token.name || token.given_name || token.email || token.preferred_username || '';
}

export const login = () => keycloak.login();
export const register = () => keycloak.register();
export const logout = () => keycloak.logout({ redirectUri: `${location.origin}/` });

/** Authorization header for API calls (empty for guests); refreshes a token about to expire. */
export async function authHeaders() {
  if (!isLoggedIn()) return {};
  try {
    await keycloak.updateToken(30);
    return { Authorization: `Bearer ${keycloak.token}` };
  } catch {
    keycloak.clearToken(); // the session has ended: continue as guest
    return {};
  }
}
