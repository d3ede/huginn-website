'use client';
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
          <span className="eyebrow">03 / SIMPLE ECONOMICS</span>
          <h2>
            Only pay for
            <br />
            <em>the result.</em>
          </h2>
        </div>
        <p>
          One clear rate. A balance you control.
          <br />
          No subscription to keep track of.
        </p>
      </div>
      <div className="pricing-panel">
        <div>
          <span className="eyebrow">PAY AS YOU GO</span>
          <div className="price">
            {config ? usd(Number(config.pricePerTask) * 1000) : '—'}
            <span> / 1,000 solutions</span>
          </div>
          <p>hCaptcha · USD · charged per successful task</p>
          {config && (!config.paymentsAvailable || !config.solverAvailable) && (
            <span className="availability-note">
              Preview release. {config.paymentsAvailable ? '' : 'Payments are not connected yet.'}{' '}
              {config.solverAvailable ? '' : 'Task processing is not enabled yet.'}
            </span>
          )}
          {error && <p className="availability-note">Pricing is temporarily unavailable.</p>}
        </div>
        <ul>
          {['No recurring fees', 'Failed tasks refunded', 'Usage and spending visibility'].map(
            (t) => (
              <li key={t}>
                <Check size={15} />
                {t}
              </li>
            ),
          )}
        </ul>
        <Link className="button button-primary" href="/register">
          Create an account <ArrowUpRight size={16} />
        </Link>
      </div>
    </section>
  );
}
