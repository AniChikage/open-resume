import { Loader2 } from 'lucide-react';
import type * as React from 'react';
import { useEffect,useState } from 'react';
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { useTheme } from '../lib/theme.tsx';
import { Button } from './ui/button.tsx';
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, loginWithUsername, config, loading } = useAuth();
  const { t, lang } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (showAuthModal) { setUsername(config?.demoUsername || ''); setPassword(config?.demoPassword || ''); setError(''); }
  }, [showAuthModal, config]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try { await loginWithUsername(username, password); }
    catch { setError(openText(lang, 'loginError')); }
    finally { setBusy(false); }
  }
  return <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
    <DialogContent closeLabel={t('Close')} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{openText(lang, config?.demoLogin ? 'demoTitle' : 'privateTitle')}</DialogTitle>
        <DialogDescription>{openText(lang, 'workspace')}</DialogDescription>
      </DialogHeader>
      {config?.demoLogin && <div className="rounded-md border border-border bg-muted p-3 text-sm leading-6">
        <span>{openText(lang, 'credentials')}</span>
        <code className="block break-all">{config.demoUsername}</code>
        <code className="block">{config.demoPassword}</code>
      </div>}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium">{t('Account')}<Input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label className="flex flex-col gap-2 text-sm font-medium">{t('Password')}<Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={busy || loading || !config}>{busy && <Loader2 className="animate-spin" />}{openText(lang, 'enter')}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
