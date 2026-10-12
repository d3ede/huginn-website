'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  KeyRound,
  Settings,
  ArrowUpRight,
  LogOut,
  LoaderCircle,
  Menu,
  X,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { User, PublicConfig } from '@/lib/types';
import { Brand } from './brand';
type WorkspaceContext = { user: User; config: PublicConfig; refreshUser: () => Promise<void> };
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
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
  }, [load]);
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  async function logout() {
    setLoggingOut(true);
    try {
      await api('/auth/logout', { method: 'POST' });
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
              {error}
            </p>
            <button className="button button-outline" onClick={load}>
              Try again
            </button>
          </>
        ) : (
          <>
            <LoaderCircle size={22} className="spin" />
            <span>Opening your workspace…</span>
          </>
        )}
      </main>
    );
  return (
    <Context.Provider value={{ user, config, refreshUser }}>
      <div className="workspace">
        <div className="workspace-mobile-header">
          <Brand />
          <button
            className="icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
          >
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <button
            aria-label="Close navigation"
            className="sidebar-backdrop"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
          <Brand />
          <span className="sidebar-label">WORKSPACE</span>
          <nav aria-label="Workspace navigation">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                key={href}
                className={pathname === href ? 'active' : ''}
                aria-current={pathname === href ? 'page' : undefined}
              >
                <Icon size={17} strokeWidth={1.4} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <Link href="/docs" className="sidebar-docs">
              Documentation <ArrowUpRight size={14} />
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
                aria-label="Sign out"
              >
                {loggingOut ? <LoaderCircle size={16} className="spin" /> : <LogOut size={16} />}
              </button>
            </div>
          </div>
        </aside>
        <main className="workspace-main" id="main">
          <div className="workspace-topline">
            <span>
              HUGINN <span className="breadcrumb-slash">/</span>{' '}
              {navigation.find((n) => n.href === pathname)?.label.toUpperCase() ?? 'WORKSPACE'}
            </span>
            <span className="workspace-environment">
              <i />
              {config.demoMode ? 'DEVELOPMENT DEMO' : 'YOUR WORKSPACE'}
            </span>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {config.demoMode && (
            <div className="demo-banner">
              Development demo · Sample records are stored in this local database. Metrics are not
              service performance claims.
            </div>
          )}
          {children}
          <footer className="workspace-footer">
            <span>OBSERVE. ADAPT. AUTOMATE.</span>
            <Link href="/">huginn.</Link>
          </footer>
        </main>
      </div>
    </Context.Provider>
  );
}
