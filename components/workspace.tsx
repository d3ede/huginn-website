'use client';
import { Text, useI18n, LanguageSwitch } from '@/components/i18n';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  KeyRound,
  Settings,
  ShieldCheck,
  ArrowUpRight,
  LogOut,
  LoaderCircle,
  Menu,
  X,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { User, PublicConfig } from '@/lib/types';
import { Brand } from './brand';
import { ThemeSwitch } from './theme';
import { useSession } from './session';
type WorkspaceContext = {
  user: User;
  config: PublicConfig;
  refreshUser: () => Promise<void>;
  refreshConfig: () => Promise<void>;
};
const Context = createContext<WorkspaceContext | null>(null);
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error('Workspace context is required');
  return value;
}
const navigation = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/app/billing', label: 'Billing', icon: Wallet },
  { href: '/app/keys', label: 'API Keys', icon: KeyRound },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];
export function Workspace({ children }: { children: React.ReactNode }) {
  const { t, locale } = useI18n();

  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const refreshConfig = useCallback(async () => {
    setConfig(await api<PublicConfig>('/public/config'));
  }, []);
  const refreshUser = useCallback(async () => {
    try {
      const result = await api<{ user: User }>('/account');
      setUser(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace('/login');
      throw error;
    }
  }, [router]);
  const load = useCallback(async () => {
    setError('');
    try {
      const [account, settings] = await Promise.all([
        api<{ user: User }>('/account'),
        api<PublicConfig>('/public/config'),
      ]);
      setUser(account.user);
      setConfig(settings);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace('/login');
      else setError(error instanceof Error ? error.message : 'Unable to load your workspace.');
    }
  }, [router]);
  useEffect(() => {
    void load();
    const refresh = () => {
      void Promise.all([refreshUser(), refreshConfig()]).catch(() => {});
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [load, refreshUser, refreshConfig]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
      await session.refresh();
      router.replace('/login');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign out failed.');
      setLoggingOut(false);
    }
  }
  if (!user || !config)
    return (
      <main id="main" className="workspace-loading">
        <Brand />
        {error ? (
          <>
            <p className="form-error" role="alert">
              <Text>{error}</Text>
            </p>
            <button className="button button-outline" onClick={load}>
              <Text> Try again </Text>
            </button>
          </>
        ) : (
          <>
            <LoaderCircle size={22} className="spin" />
            <span>
              <Text>Opening your workspace…</Text>
            </span>
          </>
        )}
      </main>
    );
  return (
    <Context.Provider value={{ user, config, refreshUser, refreshConfig }}>
      <div className="workspace">
        <div className="workspace-mobile-header">
          <Brand />
          <ThemeSwitch />
          <LanguageSwitch />
          <button
            className="icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={t(menu ? 'Close menu' : 'Open menu')}
            aria-expanded={menu}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <button
            aria-label={t('Close navigation')}
            className="sidebar-backdrop"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
          <div className="sidebar-brand-row">
            <Brand />
            <LanguageSwitch />
          </div>
          <nav aria-label={t('Workspace navigation')}>
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                className={pathname === href ? 'active' : ''}
                aria-current={pathname === href ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.4} />
                <Text>{label}</Text>
              </Link>
            ))}
            {user.isAdmin && (
              <Link
                href="/app/admin"
                className={pathname === '/app/admin' ? 'active' : ''}
                aria-current={pathname === '/app/admin' ? 'page' : undefined}
              >
                <ShieldCheck size={17} strokeWidth={1.4} />
                <Text>Admin panel</Text>
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <Link href="/docs" className="sidebar-docs">
              <Text> Documentation </Text>
              <ArrowUpRight size={14} />
            </Link>
            <div className="sidebar-user">
              <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <span>{user.name}</span>
                <small title={user.email}>{user.email}</small>
              </div>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="icon-button"
                aria-label={t('Sign out')}
              >
                {loggingOut ? <LoaderCircle size={16} className="spin" /> : <LogOut size={16} />}
              </button>
            </div>
          </div>
        </aside>
        <main className="workspace-main" id="main">
          <div className="workspace-topline">
            <ThemeSwitch />
            <span>
              <Text> HUGINN </Text>
              <span className="breadcrumb-slash">/</span>{' '}
              <Text>
                {pathname === '/app/admin'
                  ? 'Admin panel'
                  : (navigation.find((n) => n.href === pathname)?.label.toUpperCase() ??
                    'WORKSPACE')}
              </Text>
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              <Text>{error}</Text>
            </p>
          )}
          {config.demoMode && (
            <div className="demo-banner">
              <Text>
                {' '}
                Development demo · Sample records are stored in this local database. Metrics are not
                service performance claims.{' '}
              </Text>
            </div>
          )}
          {children}
        </main>
      </div>
    </Context.Provider>
  );
}
