'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { User } from '@/lib/types';
import { Text } from './i18n';

const Context = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const pathname = usePathname();
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await api<{ user: User }>('/account');
      if (request === sequence.current) setUser(result.user);
    } catch (error) {
      if (request === sequence.current && error instanceof ApiError && error.status === 401)
        setUser(null);
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  useEffect(() => {
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);
  return <Context.Provider value={{ user, loading, refresh }}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('Session provider is required');
  return value;
}

export function AccountLink({
  children,
  className,
  href = '/app',
  label = 'Open workspace',
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  label?: string;
}) {
  const { user, loading } = useSession();
  if (loading)
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  return (
    <Link className={className} href={user ? href : '/register'}>
      {user ? <Text>{label}</Text> : children}
    </Link>
  );
}
