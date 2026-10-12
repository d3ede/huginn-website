'use client';
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
          <span className="eyebrow">BALANCE & TRANSACTIONS</span>
          <h1>
            Clear spending.
            <br className="mobile-break" /> <em>Full control.</em>
          </h1>
          <p>Only successful solutions become final charges.</p>
        </div>
      </header>
      <div className="billing-overview">
        <section>
          <span className="eyebrow">AVAILABLE BALANCE</span>
          <strong className="balance-large">{data ? usd(data.balance) : '—'}</strong>
          <p>USD · prepaid balance</p>
          <div className="billing-rate">
            <span>Current hCaptcha rate</span>
            <span>{usd(Number(config.pricePerTask) * 1000)} / 1,000</span>
          </div>
        </section>
        <form className="topup-form" onSubmit={checkout}>
          <h2>Add to your balance</h2>
          <p>
            {config.paymentsAvailable
              ? 'You’ll continue to a secure provider checkout.'
              : 'Payments are not connected yet. Your balance will not change.'}
          </p>
          <label>
            Amount in USD
            <div className="amount-input">
              <span>$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={5}
                max={10000}
                step={1}
                required
              />
            </div>
          </label>
          <button className="button button-primary" disabled={busy || !config.paymentsAvailable}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <>
                Continue to checkout <ArrowUpRight size={15} />
              </>
            )}
          </button>
          <span className="field-hint">Balance is credited only after a confirmed payment.</span>
        </form>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="section-subheading">
        <h2>Transaction history</h2>
        <span className="muted">{data?.total ?? '—'} entries</span>
      </div>
      <section className="workspace-panel full-panel">
        {!data ? (
          <p className="panel-loading">Loading transactions…</p>
        ) : !data.entries.length ? (
          <div className="empty-state">
            <Wallet size={23} strokeWidth={1.2} />
            <h3>A clean ledger.</h3>
            <p>Payments, reservations, and refunds will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Balance after</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="bright">{labels[entry.kind] ?? entry.kind}</td>
                    <td>{dateTime(entry.createdAt, user.timezone)}</td>
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
          ← Previous
        </button>
        <span>Page {page}</span>
        <button disabled={!data || page * 20 >= data.total} onClick={() => setPage((v) => v + 1)}>
          Next →
        </button>
      </div>
    </>
  );
}
