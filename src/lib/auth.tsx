import type { PropsWithChildren } from 'react';
import { createContext,useContext,useEffect,useState } from 'react';
import type { AppConfig,WorkspaceUser } from '../types.ts';
import { clearContinuation,rememberContinuation,takeContinuation } from './auth-continuation.ts';
import { navigate } from './router.ts';
import { clearDrafts } from './drafts.ts';

export interface AuthState { user:WorkspaceUser|null; loading:boolean; config:AppConfig|null; login:(destination?:unknown)=>void; loginWithUsername:(username:string,password:string)=>Promise<void>; logout:()=>Promise<void>; showAuthModal:boolean; setShowAuthModal:(open:boolean)=>void }
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/auth/me').then((res) => res.json()), fetch('/api/config').then((res) => res.json())])
      .then(([auth, settings]) => { if (!cancelled) { setUser(auth.user); setConfig(settings); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  function login(destination?: unknown) {
    clearContinuation();
    if (typeof destination === 'string') rememberContinuation(destination);
    setShowAuthModal(true);
  }
  function dismiss(open: boolean) {
    if (!open) clearContinuation();
    setShowAuthModal(open);
  }
  async function loginWithUsername(username: string, password: string) {
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
    clearDrafts();
    setUser(null);
    navigate('/');
  }
  return <AuthContext.Provider value={{ user, loading, config, login, loginWithUsername, logout, showAuthModal, setShowAuthModal: dismiss }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is required'); return value; }
