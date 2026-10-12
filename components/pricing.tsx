'use client';
import { Text } from '@/components/i18n';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
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
            <Text> Only pay for </Text>
            <br />
            <em>
              <Text>the result.</Text>
            </em>
          </h2>
        </div>
        <p>
          <Text> One clear rate. A balance you control. </Text>
          <br />
          <Text> No subscription to keep track of. </Text>
        </p>
      </div>
      <div className="pricing-panel">
        <div>
          <div className="price">
            {config ? usd(Number(config.pricePerTask) * 1000) : '—'}
            <span>
              <Text> / 1,000 solutions</Text>
            </span>
          </div>
          <p>
            <Text>hCaptcha · USD · charged per successful task</Text>
          </p>
          {config && (!config.paymentsAvailable || !config.solverAvailable) && (
            <span className="availability-note">
              <Text> Preview release. </Text>
              <Text>{config.paymentsAvailable ? '' : 'Payments are not connected yet.'}</Text>{' '}
              <Text>{config.solverAvailable ? '' : 'Task processing is not enabled yet.'}</Text>
            </span>
          )}
          {error && (
            <p className="availability-note">
              <Text>Pricing is temporarily unavailable.</Text>
            </p>
          )}
        </div>
        <ul>
          {['No recurring fees', 'Failed tasks refunded', 'Usage and spending visibility'].map(
            (t) => (
              <li key={t}>
                <Check size={15} />
                <Text>{t}</Text>
              </li>
            ),
          )}
        </ul>
        <Link className="button button-primary" href="/register">
          <Text> Create an account </Text>
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
