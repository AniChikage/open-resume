import { lazy,Suspense,useEffect } from 'react';
import { AuthModal } from './components/AuthModal.tsx';
import { Skeleton } from './components/ui/skeleton.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { AuthProvider,useAuth } from './lib/auth.tsx';
import { useRouter } from './lib/router.ts';
import { ThemeProvider,useTheme } from './lib/theme.tsx';

const Landing = lazy(() => import('./pages/Landing.tsx'));
const Templates = lazy(() => import('./pages/Templates.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Editor = lazy(() => import('./pages/Editor.tsx'));
const SharedView = lazy(() => import('./pages/SharedView.tsx'));

function Routes() {
  const { path, params, match } = useRouter();
  const { lang } = useTheme();
  const { user, loading } = useAuth();
  useEffect(() => { document.title = 'Open Resume · ' + (lang.startsWith('zh') ? '自由制作你的简历' : 'Your resume, on your terms'); }, [lang, path]);
  const editor = match('/editor/:id');
  if (path === '/share') return <SharedView encodedData={params.d} />;
  if (editor) {
    if (loading) return <Skeleton className="m-8 h-96" />;
    if (!user) return <Dashboard />;
    return <Editor key={editor.id} resumeId={editor.id} />;
  }
  if (path === '/templates') return <Templates />;
  if (path === '/dashboard') return <Dashboard />;
  return <Landing />;
}

export default function App() {
  return <ThemeProvider><TooltipProvider><AuthProvider>
    <Suspense fallback={<div className="site-shell mx-auto p-8"><Skeleton className="h-12 w-64" /><Skeleton className="mt-8 h-96" /></div>}><Routes /></Suspense>
    <AuthModal />
  </AuthProvider></TooltipProvider></ThemeProvider>;
}
