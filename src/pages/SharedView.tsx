import { Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LanguageMenu } from '../components/SiteChrome.tsx';
import { ResponsiveResumePreview } from '../components/ResponsiveResumePreview.tsx';
import { Button } from '../components/ui/button.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { navigate } from '../lib/router.ts';
import { parseShareData } from '../lib/share.ts';
import { useTheme } from '../lib/theme.tsx';
import type { EditorDocument } from '../types.ts';

export default function SharedView({ encodedData }: {encodedData:string}) {
  const { t } = useTheme();
  const [data, setData] = useState<EditorDocument|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    parseShareData(encodedData).then(result => {
      if (!cancelled) { setData(result); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [encodedData]);

  if (loading) return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5"><Skeleton className="h-8 w-28" /><Skeleton className="h-5 w-16" /></div>
      <div className="flex flex-1 justify-center px-5 pb-16 pt-4"><Skeleton className="aspect-[210/297] w-full max-w-[794px]" /></div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">{t('This link is invalid or has expired')}</p>
      <Button onClick={() => navigate('/')}>{t('Back to home')}</Button>
    </div>
  );

  const { resume, settings } = data;


  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between border-b border-border px-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <Home size={14} /> {t('Resume builder')}
        </Button>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{t('Read-only preview')}</span><LanguageMenu /></div>
      </header>
      <div className="mx-auto max-w-4xl px-3 pb-10 pt-4 sm:px-6">
        <ResponsiveResumePreview resume={resume} settings={settings} />
      </div>
      <footer className="pb-8 text-center">
        <a href="#/" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
          {t('Made with')} <span className="font-semibold text-foreground">Open Resume</span> — {t('Create your professional resume for free')}
        </a>
      </footer>
    </main>
  );
}
