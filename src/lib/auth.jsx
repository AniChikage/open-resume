import { createContext, useContext, useEffect, useState } from 'react';
import { clearContinuation, rememberContinuation, takeContinuation } from './auth-continuation.js';
import { navigate } from './router.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/auth/me').then((res) => res.json()), fetch('/api/config').then((res) => res.json())])
      .then(([auth, settings]) => { if (!cancelled) { setUser(auth.user); setConfig(settings); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  function login(destination) {
    clearContinuation();
    if (typeof destination === 'string') rememberContinuation(destination);
    setShowAuthModal(true);
  }
  function dismiss(open) {
    if (!open) clearContinuation();
    setShowAuthModal(open);
  }
  async function loginWithUsername(username, password) {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'SIGN_IN_FAILED');
    setUser(data.user);
    setShowAuthModal(false);
    navigate(takeContinuation() || '/dashboard');
  }
  async function logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    if (!res.ok) return;
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('draft_')) sessionStorage.removeItem(key);
    setUser(null);
    navigate('/');
  }
  return <AuthContext.Provider value={{ user, loading, config, login, loginWithUsername, logout, showAuthModal, setShowAuthModal: dismiss }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
