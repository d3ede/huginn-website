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
    api<PublicConfig>('/public/config')
      .then(setConfig)
      .catch(() => setError(true));
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
        <div>
          <div className="price">
            {config ? usd(Number(config.pricePerTask) * 1000) : '—'}
            <span>
              <Text> / 1,000 solutions</Text>
            </span>
          </div>
          <p className="pricing-task-type">
            <img src="/images/hcaptcha.svg" width="20" height="20" alt="" />
            <Text>hCaptcha · USD · charged per successful task</Text>
          </p>
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
