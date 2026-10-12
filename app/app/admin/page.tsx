'use client';
import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Text, useI18n } from '@/components/i18n';
import { useWorkspace } from '@/components/workspace';
import { api, dateTime } from '@/lib/api';
import { AdminAnalytics } from '@/components/admin-analytics';

type Product = {
  id: string;
  name: string;
  pricePerThousand: string;
  enabled: boolean;
  supported: boolean;
};
type BillingSettings = {
  revision: number;
  taskProducts: Product[];
  topUpMinUsd: number;
  topUpMaxUsd: number;
  paymentProvider: 'disabled' | 'http';
  paymentURL: string;
  paymentSecretConfigured: boolean;
  webhookSecretConfigured: boolean;
  changedById: string | null;
  changedByName?: string | null;
  updatedAt: string;
};
const sections = ['Statistics', 'Task types', 'Payments', 'Settings history'] as const;
export default function AdminPage() {
  const { user, refreshConfig } = useWorkspace();
  const { locale, t } = useI18n();
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [provider, setProvider] = useState('disabled');
  const [history, setHistory] = useState<{ changes: BillingSettings[]; total: number } | null>(
    null,
  );
  const [section, setSection] = useState<(typeof sections)[number]>('Statistics');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const apply = useCallback((value: BillingSettings) => {
    setSettings(value);
    setProducts(value.taskProducts);
    setProvider(value.paymentProvider);
    setDirty(false);
  }, []);
  const load = useCallback(async () => {
    try {
      apply(await api<BillingSettings>('/admin/billing'));
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load settings.');
    }
  }, [apply]);
  const loadHistory = useCallback(async () => {
    try {
      setHistory(await api(`/admin/billing/history?page=${page}`));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load settings.');
    }
  }, [page]);
  useEffect(() => {
    if (user.isAdmin) void load();
  }, [user.isAdmin, load]);
  useEffect(() => {
    if (user.isAdmin) void loadHistory();
  }, [user.isAdmin, loadHistory]);
  function editProduct(index: number, change: Partial<Product>) {
    setProducts((entries) =>
      entries.map((entry, i) => (i === index ? { ...entry, ...change } : entry)),
    );
    setDirty(true);
    setSuccess(false);
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      const value = await api<BillingSettings>('/admin/billing', {
        method: 'PATCH',
        body: JSON.stringify({
          revision: settings.revision,
          taskProducts: products.map(({ supported: _supported, ...entry }) => entry),
          topUpMinUsd: Number(form.get('topUpMinUsd')),
          topUpMaxUsd: Number(form.get('topUpMaxUsd')),
          paymentProvider: provider,
          paymentURL: form.get('paymentURL'),
          ...(form.get('paymentSecret') ? { paymentSecret: form.get('paymentSecret') } : {}),
          ...(form.get('webhookSecret') ? { webhookSecret: form.get('webhookSecret') } : {}),
          clearPaymentSecret: form.get('clearPaymentSecret') === 'on',
          clearWebhookSecret: form.get('clearWebhookSecret') === 'on',
        }),
      });
      apply(value);
      setSuccess(true);
      await refreshConfig();
      await loadHistory();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save settings.');
    } finally {
      setBusy(false);
    }
  }
  if (!user.isAdmin)
    return (
      <p role="alert">
        <Text>Administrator access is required.</Text>
      </p>
    );
  return (
    <>
      <header className="workspace-page-heading">
        <div>
          <h1>
            <Text>Admin panel</Text>
          </h1>
          <p>
            <Text>Manage task types, rates and payments. Changes apply immediately.</Text>
          </p>
        </div>
        <button
          className="button button-outline button-small"
          onClick={() => {
            setSuccess(false);
            void load();
          }}
          disabled={busy || dirty}
        >
          <RefreshCw size={15} />
          <Text>Reload settings</Text>
        </button>
      </header>
      <nav className="admin-tabs" aria-label={t('Admin sections')}>
        {sections.map((label) => (
          <button
            type="button"
            key={label}
            aria-current={section === label ? 'page' : undefined}
            onClick={() => setSection(label)}
          >
            <Text>{label}</Text>
          </button>
        ))}
      </nav>
      {section === 'Statistics' && <AdminAnalytics />}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-success" role="status">
          <Text>Settings saved. No restart is needed.</Text>
        </p>
      )}
      {!settings ? (
        <p>
          <LoaderCircle className="spin" size={16} /> <Text>Loading settings…</Text>
        </p>
      ) : (
        <>
          <form
            key={settings.revision}
            className="admin-form"
            onSubmit={save}
            onInvalidCapture={(event) => {
              const panel = (event.target as HTMLElement).closest<HTMLElement>(
                '[data-admin-section]',
              );
              if (panel) setSection(panel.dataset.adminSection as (typeof sections)[number]);
            }}
            onChange={() => {
              setDirty(true);
              setSuccess(false);
            }}
            hidden={section === 'Settings history' || section === 'Statistics'}
          >
            <fieldset disabled={busy}>
              <section
                data-admin-section="Task types"
                hidden={section !== 'Task types'}
                aria-label={t('Task types')}
              >
                <div className="admin-section-heading">
                  <div>
                    <h2>
                      <Text>Task catalog</Text>
                    </h2>
                    <p>
                      <Text>Set a separate rate and availability for each task type.</Text>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => {
                      let suffix = products.length + 1;
                      while (products.some((entry) => entry.id === `task_${suffix}`)) suffix++;
                      setProducts((entries) => [
                        ...entries,
                        {
                          id: `task_${suffix}`,
                          name: t('New task type'),
                          pricePerThousand: '2',
                          enabled: false,
                          supported: false,
                        },
                      ]);
                      setDirty(true);
                      setSuccess(false);
                    }}
                    disabled={products.length >= 100}
                  >
                    <Plus size={15} />
                    <Text>Add task type</Text>
                  </button>
                </div>
                <p className="field-hint admin-description">
                  <Text>
                    Draft types stay private until their solver adapter is registered. Disabling a
                    type stops new tasks; accepted tasks finish at their reserved rate.
                  </Text>
                </p>
                <div className="admin-products">
                  {products.map((product, index) => (
                    <article className="admin-product" key={index}>
                      <div className="admin-product-heading">
                        <strong>{product.name || product.id}</strong>
                        <span className="admin-status">
                          <Text>
                            {!product.supported
                              ? 'Draft'
                              : product.enabled
                                ? 'Enabled'
                                : 'Disabled'}
                          </Text>
                        </span>
                      </div>
                      <div className="form-grid">
                        <label>
                          <Text>Type ID</Text>
                          <input
                            value={product.id}
                            readOnly={product.supported}
                            required
                            pattern="[a-z][a-z0-9_-]{0,63}"
                            maxLength={64}
                            onChange={(e) => editProduct(index, { id: e.target.value })}
                          />
                        </label>
                        <label>
                          <Text>Display name</Text>
                          <input
                            value={product.name}
                            required
                            maxLength={80}
                            onChange={(e) => editProduct(index, { name: e.target.value })}
                          />
                        </label>
                        <label>
                          <Text>Price per 1,000 solutions (USD)</Text>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            max="1000"
                            value={product.pricePerThousand}
                            required
                            onChange={(e) =>
                              editProduct(index, { pricePerThousand: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="admin-product-actions">
                        <label className="checkbox-field">
                          <input
                            type="checkbox"
                            checked={product.enabled}
                            disabled={!product.supported}
                            onChange={(e) => editProduct(index, { enabled: e.target.checked })}
                          />
                          <Text>Accept new tasks</Text>
                        </label>
                        {!product.supported && (
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={t('Remove draft') + ': ' + product.name}
                            onClick={() => {
                              setProducts((entries) => entries.filter((_, i) => i !== index));
                              setDirty(true);
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              <section
                data-admin-section="Payments"
                hidden={section !== 'Payments'}
                aria-label={t('Payments')}
              >
                <div className="admin-section-heading">
                  <div>
                    <h2>
                      <Text>Balance and checkout</Text>
                    </h2>
                    <p>
                      <Text>Configure balance limits and your payment connection.</Text>
                    </p>
                  </div>
                  <span className="admin-status">
                    <Text>{provider === 'http' ? 'Enabled' : 'Disabled'}</Text>
                  </span>
                </div>
                <div className="form-grid">
                  <label>
                    <Text>Minimum top-up (USD)</Text>
                    <input
                      name="topUpMinUsd"
                      type="number"
                      step="1"
                      min="1"
                      max="1000000"
                      defaultValue={settings.topUpMinUsd}
                      required
                    />
                  </label>
                  <label>
                    <Text>Maximum top-up (USD)</Text>
                    <input
                      name="topUpMaxUsd"
                      type="number"
                      step="1"
                      min="1"
                      max="1000000"
                      defaultValue={settings.topUpMaxUsd}
                      required
                    />
                  </label>
                  <label>
                    <Text>Payment provider</Text>
                    <select
                      name="paymentProvider"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                    >
                      <option value="disabled">{t('Disabled')}</option>
                      <option value="http">{t('HTTP payment adapter')}</option>
                    </select>
                  </label>
                  <label className="form-wide">
                    <Text>Payment endpoint</Text>
                    <input
                      name="paymentURL"
                      type="url"
                      maxLength={2048}
                      defaultValue={settings.paymentURL}
                      placeholder="https://payments.example/checkout"
                      required={provider === 'http'}
                    />
                  </label>
                  <label>
                    <Text>Payment secret</Text>
                    <input
                      name="paymentSecret"
                      type="password"
                      autoComplete="new-password"
                      maxLength={4096}
                      placeholder={t(
                        settings.paymentSecretConfigured
                          ? 'Configured — leave blank to keep'
                          : 'Not configured',
                      )}
                    />
                  </label>
                  <label>
                    <Text>Webhook secret</Text>
                    <input
                      name="webhookSecret"
                      type="password"
                      autoComplete="new-password"
                      minLength={32}
                      maxLength={4096}
                      placeholder={t(
                        settings.webhookSecretConfigured
                          ? 'Configured — leave blank to keep'
                          : 'Not configured',
                      )}
                    />
                  </label>
                </div>
                <p className="field-hint admin-description">
                  <Text>Secrets are write-only. Leave blank to keep the stored value.</Text>
                </p>
                <details className="admin-advanced">
                  <summary>
                    <Text>Remove stored credentials</Text>
                  </summary>
                  <div>
                    <label className="checkbox-field">
                      <input type="checkbox" name="clearPaymentSecret" />
                      <Text>Clear payment secret</Text>
                    </label>
                    <label className="checkbox-field">
                      <input type="checkbox" name="clearWebhookSecret" />
                      <Text>Clear webhook secret</Text>
                    </label>
                  </div>
                </details>
                <div className="admin-webhook">
                  <span>
                    <Text>Webhook URL:</Text>
                  </span>
                  <code>
                    {typeof window === 'undefined' ? '' : window.location.origin}
                    /api/webhooks/payment
                  </code>
                  <button
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(`${location.origin}/api/webhooks/payment`)
                        .catch(() => setError(t('Unable to copy URL.')));
                    }}
                  >
                    <Text>Copy URL</Text>
                  </button>
                </div>
              </section>
            </fieldset>
            <div className="admin-save-bar">
              <span>
                <Text>{dirty ? 'Unsaved changes' : 'All changes saved'}</Text>
              </span>
              <div>
                <button
                  type="button"
                  className="button button-outline button-small"
                  disabled={busy || !dirty}
                  onClick={(event) => {
                    event.currentTarget.form?.reset();
                    apply(settings);
                    setSuccess(false);
                  }}
                >
                  <Text>Discard changes</Text>
                </button>
                <button className="button button-primary button-small" disabled={busy || !dirty}>
                  {busy && <LoaderCircle size={16} className="spin" />}
                  <Text>Save changes</Text>
                </button>
              </div>
            </div>
          </form>
          {section === 'Settings history' && (
            <>
              <div className="admin-section-heading">
                <div>
                  <h2>
                    <Text>Settings history</Text>
                  </h2>
                  <p>
                    <Text>Each saved version records task rates and payment settings.</Text>
                  </p>
                </div>
              </div>
              <section className="workspace-panel full-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {['Revision', 'Date', 'Task types', 'Payment provider', 'Changed by'].map(
                          (label) => (
                            <th key={label}>
                              <Text>{label}</Text>
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {history?.changes.map((change) => (
                        <tr key={change.revision}>
                          <td>{change.revision}</td>
                          <td>{dateTime(change.updatedAt, user.timezone, locale)}</td>
                          <td>
                            {change.taskProducts.map((entry) => (
                              <div key={entry.id}>
                                {entry.name}: ${entry.pricePerThousand} / 1,000 ·{' '}
                                <Text>{entry.enabled ? 'Enabled' : 'Disabled'}</Text>
                              </div>
                            ))}
                          </td>
                          <td>
                            <Text>
                              {change.paymentProvider === 'http'
                                ? 'HTTP payment adapter'
                                : 'Disabled'}
                            </Text>
                          </td>
                          <td>
                            {change.changedByName ?? change.changedById ?? t('Initial settings')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
                  <Text>← Previous</Text>
                </button>
                <span>
                  <Text>Page</Text> {page}
                </span>
                <button
                  disabled={!history || page * 20 >= history.total}
                  onClick={() => setPage((value) => value + 1)}
                >
                  <Text>Next →</Text>
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
