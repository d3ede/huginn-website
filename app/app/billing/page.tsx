'use client';
import { Text, useI18n } from '@/components/i18n';

import { useEffect, useState } from 'react';
import { ArrowUpRight, LoaderCircle, Wallet } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { api, usd, dateTime } from '@/lib/api';
type Billing = {
  balance: string;
  entries: { id: string; kind: string; amount: string; balanceAfter: string; createdAt: string }[];
  total: number;
};
const labels: Record<string, string> = {
  payment: 'Balance top-up',
  task_reserve: 'Task reservation',
  task_refund: 'Task refund',
  dev_credit: 'Development demo credit',
};
export default function BillingPage() {
  const { locale } = useI18n();
  const { config, user } = useWorkspace();
  const [data, setData] = useState<Billing | null>(null);
  const [page, setPage] = useState(1);
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    api<Billing>(`/billing?page=${page}`, { signal: abort.signal })
      .then(setData)
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [page]);
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await api<{ checkoutURL: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      window.location.assign(result.checkoutURL);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to start checkout.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="workspace-page-heading">
        <div>
          <h1>
            <Text>Billing</Text>
          </h1>
          <p>
            <Text>Only successful solutions become final charges.</Text>
          </p>
        </div>
      </header>
      <div className="billing-overview">
        <section>
          <strong className="balance-large">{data ? usd(data.balance) : '—'}</strong>
          <p>
            <Text>USD · prepaid balance</Text>
          </p>
          <div className="billing-rate">
            <span>
              <Text>Current task rates</Text>
            </span>
            <span>
              {config.taskProducts.map((product) => (
                <div key={product.id}>
                  {product.name} · {usd(Number(product.pricePerTask) * 1000)} / 1,000
                </div>
              ))}
            </span>
          </div>
        </section>
        <form className="topup-form" onSubmit={checkout}>
          <h2>
            <Text>Add to your balance</Text>
          </h2>
          <p>
            <Text>You’ll continue to a secure checkout.</Text>
          </p>
          <label>
            <Text> Amount in USD </Text>
            <div className="amount-input">
              <span>$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={config.topUpMinUsd}
                max={config.topUpMaxUsd}
                step={1}
                required
              />
            </div>
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <>
                <Text> Continue to checkout </Text>
                <ArrowUpRight size={15} />
              </>
            )}
          </button>
          <span className="field-hint">
            <Text>Balance is credited only after a confirmed payment.</Text>
          </span>
        </form>
      </div>
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      <div className="section-subheading">
        <h2>
          <Text>Transaction history</Text>
        </h2>
        <span className="muted">
          {data?.total ?? '—'}
          <Text> entries</Text>
        </span>
      </div>
      <section className="workspace-panel full-panel">
        {!data ? (
          <p className="panel-loading">
            <Text>Loading transactions…</Text>
          </p>
        ) : !data.entries.length ? (
          <div className="empty-state">
            <Wallet size={23} strokeWidth={1.2} />
            <h3>
              <Text>No transactions yet.</Text>
            </h3>
            <p>
              <Text>Payments, reservations, and refunds will appear here.</Text>
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <Text>Transaction</Text>
                  </th>
                  <th>
                    <Text>Date</Text>
                  </th>
                  <th>
                    <Text>Amount</Text>
                  </th>
                  <th>
                    <Text>Balance after</Text>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="bright">
                      <Text>{labels[entry.kind] ?? entry.kind}</Text>
                    </td>
                    <td>{dateTime(entry.createdAt, user.timezone, locale)}</td>
                    <td className={Number(entry.amount) > 0 ? 'positive' : ''}>
                      {Number(entry.amount) > 0 ? '+' : ''}
                      {usd(entry.amount, 4)}
                    </td>
                    <td>{usd(entry.balanceAfter, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="pagination">
        <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
          <Text> ← Previous </Text>
        </button>
        <span>
          <Text>Page </Text>
          {page}
        </span>
        <button disabled={!data || page * 20 >= data.total} onClick={() => setPage((v) => v + 1)}>
          <Text> Next → </Text>
        </button>
      </div>
    </>
  );
}
