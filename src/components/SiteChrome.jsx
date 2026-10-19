import { openText } from '../lib/open-copy.js';
import { useState } from 'react';
import { Check, ChevronDown, Languages, LogIn, LogOut, Menu, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, useTheme } from '../lib/theme.jsx';
import { useAuth } from '../lib/auth.jsx';

import { Button } from './ui/button.jsx';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.jsx';
import { LogoFull } from './Logo.jsx';

const NAV_ITEMS = [
  { href: '#/', label: 'Home', key: 'home' },
  { href: '#/templates', label: 'Templates', key: 'templates' },
  { href: '#/dashboard', label: 'My Resumes', key: 'dashboard' },
];

function UserMenu({ user, login, logout }) {
  const { t } = useTheme();
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={login} aria-label={t('Sign in')}>
        <LogIn data-icon="inline-start" />
        <span className="hidden sm:inline">{t('Sign in')}</span>
      </Button>
    );
  }

  const initial = (user.name || user.email || 'O').trim().slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/30" aria-label={t('Account')} />
        }
      >
        <Avatar size="lg">
          {user?.picture ? <AvatarImage src={user.picture} alt={user.name || t('Account')} /> : null}
          <AvatarFallback className="bg-foreground font-semibold text-background">{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-foreground">{user.name || t('Account')}</span>
            <span className="mt-0.5 block truncate font-normal text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout}>
            <LogOut />
            {t('Sign out')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LanguageMenu({ iconOnly = false }) {
  const { lang, setLang, t } = useTheme();
  const activeLanguage = SUPPORTED_LANGUAGES.find(({ code }) => code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={iconOnly ? 'icon' : 'sm'}
            aria-label={`${t('Language')}: ${activeLanguage.label}`}
            title={activeLanguage.label}
          />
        }
      >
        <Languages />
        {!iconOnly ? <span>{activeLanguage.shortLabel}</span> : null}
        {!iconOnly ? <ChevronDown data-icon="inline-end" /> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">{t('Language')}</DropdownMenuLabel>
          {SUPPORTED_LANGUAGES.map((language) => (
            <DropdownMenuItem key={language.code} className="min-h-9 px-2" onClick={() => setLang(language.code)}>
              <span className="min-w-0 flex-1 truncate font-medium">{language.label}</span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{language.code}</span>
              {language.code === lang ? <Check /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


export function SiteHeader({ current = 'home' }) {
  const { t, lang } = useTheme();
  const { user, login, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
    <div className="site-shell mx-auto flex h-16 items-center justify-between gap-3 px-5 lg:px-8">
      <a href="#/" aria-label="Open Resume"><LogoFull /></a>
      <nav className="hidden items-center gap-6 md:flex" aria-label={t('Main navigation')}>
        {NAV_ITEMS.map((item) => <a key={item.key} href={item.href} aria-current={current === item.key ? 'page' : undefined} className={`text-sm transition-colors hover:text-primary ${current === item.key ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{t(item.label)}</a>)}
      </nav>
      <div className="flex items-center gap-2">
        <a href="https://justcv.org" target="_blank" rel="noopener noreferrer" className="hidden text-sm text-muted-foreground hover:text-primary lg:block">justcv.org ↗</a>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={mobileOpen ? t('Close menu') : t('Open menu')} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</Button>
        <LanguageMenu iconOnly />
        <UserMenu user={user} login={login} logout={logout} />
      </div>
    </div>
    {mobileOpen && <nav className="flex flex-col border-t border-border px-5 py-2 md:hidden" aria-label={t('Mobile navigation')}>
      {NAV_ITEMS.map((item) => <a key={item.key} href={item.href} className="py-3 text-sm" onClick={() => setMobileOpen(false)}>{t(item.label)}</a>)}
    </nav>}
  </header>;
}

export function SiteFooter() {
  const { lang } = useTheme();
  return <footer className="border-t border-border bg-background">
    <div className="site-shell mx-auto flex flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div><LogoFull /><p className="mt-2 text-xs text-muted-foreground">MIT · {openText(lang, 'eyebrow')}</p></div>
      <div className="max-w-md text-sm leading-6 text-muted-foreground"><p>{openText(lang, 'hostedDescription')}</p><a href="https://justcv.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{openText(lang, 'support')} ↗</a></div>
    </div>
  </footer>;
}
