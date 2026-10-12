'use client';
import { Text } from '@/components/i18n';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { api, usd } from '@/lib/api';
import type { PublicConfig } from '@/lib/types';
export function Pricing() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const refresh = () => {
      void api<PublicConfig>('/public/config', { signal: abort.signal })
        .then((value) => {
          setConfig(value);
          setError(false);
        })
        .catch(() => {
          if (!abort.signal.aborted) setError(true);
        });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      abort.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  return (
    <section id="pricing" className="pricing-section container section-border">
      <div className="section-heading">
        <div>
          <h2>
            <Text>Pricing</Text>
          </h2>
        </div>
      </div>
      <div className="pricing-panel">
        <div className="pricing-rates">
          {(config?.taskProducts ?? [{ id: 'loading', name: '', pricePerTask: '' }]).map(
            (product) => (
              <div key={product.id}>
                <div className="price">
                  {product.pricePerTask ? usd(Number(product.pricePerTask) * 1000) : '—'}
                  <span>
                    <Text> / 1,000 solutions</Text>
                  </span>
                </div>
                <p className="pricing-task-type">
                  {product.name && <span>{product.name} · </span>}
                  <Text>USD · charged per successful task</Text>
                </p>
              </div>
            ),
          )}
          {error && (
            <p className="availability-note">
              <Text>Pricing is temporarily unavailable.</Text>
            </p>
          )}
        </div>
        <Link className="button button-primary" href="/register">
          <Text> Create an account </Text>
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
