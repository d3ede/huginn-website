'use client';
import { Text, useI18n } from '@/components/i18n';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { TaskTable } from '@/components/task-table';
import { api, usd, seconds } from '@/lib/api';
import type { Stats } from '@/lib/types';
const ActivityChart = dynamic(() => import('@/components/activity-chart'), {
  ssr: false,
  loading: () => (
    <div className="chart-placeholder">
      <Text>Loading chart…</Text>
    </div>
  ),
});
export default function Dashboard() {
  const { t, locale } = useI18n();

  const { user } = useWorkspace();
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    api<Stats>(`/stats?days=${days}`, { signal: abort.signal })
      .then(setStats)
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [days, revision]);
  return (
    <>
      <header className="workspace-page-heading dashboard-heading">
        <div>
          <h1>
            <Text>Dashboard</Text>
          </h1>
          <p>
            <Text>Balance and task statistics.</Text>
          </p>
        </div>
        <button
          className="icon-button"
          aria-label={t('Refresh dashboard')}
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={16} />
        </button>
      </header>
      {error && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      <div className="metrics">
        <div>
          <span>
            <Text>Available balance</Text>
          </span>
          <strong>{usd(stats?.balance ?? user.balance)}</strong>
          <Link href="/app/billing">
            <Text> Top up </Text>
            <ArrowRight size={14} />
          </Link>
        </div>
        <div>
          <span>
            <Text>Solutions · </Text>
            {days}
            <Text> days</Text>
          </span>
          <strong>
            {stats?.solved.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US') ?? '—'}
          </strong>
          <small>
            <Text>
              {stats
                ? `${stats.total.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} tasks submitted`
                : 'Loading usage'}
            </Text>
          </small>
        </div>
        <div>
          <span>
            <Text>Success rate</Text>
          </span>
          <strong>
            {stats?.successRate == null
              ? '—'
              : `${stats.successRate.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          </strong>
          <small>
            <Text>Of completed tasks</Text>
          </small>
        </div>
        <div>
          <span>
            <Text>Average solve time</Text>
          </span>
          <strong>{stats?.averageMs == null ? '—' : seconds(stats.averageMs, locale)}</strong>
          <small>
            <Text>Successful tasks only</Text>
          </small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="workspace-panel activity-panel">
          <div className="panel-heading">
            <h2>
              <Text>Solutions over time</Text>
            </h2>
            <label className="period-label">
              <span className="sr-only">
                <Text>Chart period</Text>
              </span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>
                  <Text>Last 7 days</Text>
                </option>
                <option value={30}>
                  <Text>Last 30 days</Text>
                </option>
                <option value={90}>
                  <Text>Last 90 days</Text>
                </option>
              </select>
            </label>
          </div>
          {stats ? (
            <ActivityChart data={stats.daily} />
          ) : (
            <div className="chart-placeholder">
              <Text>{error ? 'Unable to load activity.' : 'Loading activity…'}</Text>
            </div>
          )}
          <div className="chart-legend">
            <span>
              <i />
              <Text> Solved </Text>
            </span>
            <span>
              <i className="failed" />
              <Text> Failed </Text>
            </span>
            <small>
              <Text>UTC</Text>
            </small>
          </div>
        </section>
        <section className="workspace-panel types-panel">
          <div className="panel-heading">
            <h2>
              <Text>Task types</Text>
            </h2>
            <span className="muted">
              {days}
              <Text> days</Text>
            </span>
          </div>
          {stats?.types.length ? (
            <div className="type-bars">
              {stats.types.map((type) => (
                <div key={type.type}>
                  <div>
                    <span>
                      <Text>hCaptcha</Text>
                    </span>
                    <span>{type.count.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}</span>
                  </div>
                  <div className="type-track">
                    <span
                      style={{ width: `${stats.total ? (type.count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="types-empty">
              <span className="type-track" />
              <p>
                <Text>{stats ? 'No tasks in this period.' : 'Loading task types…'}</Text>
              </p>
            </div>
          )}
        </section>
        <section className="workspace-panel recent-panel">
          <div className="panel-heading">
            <h2>
              <Text>Recent tasks</Text>
            </h2>
            <Link href="/app/tasks" className="text-link small">
              <Text> View all </Text>
              <ArrowRight size={14} />
            </Link>
          </div>
          {stats ? (
            <TaskTable tasks={stats.recent} />
          ) : (
            <p className="panel-loading">
              <Text>Loading tasks…</Text>
            </p>
          )}
        </section>
        <section className="workspace-panel access-panel">
          <div className="panel-heading">
            <h2>
              <Text>Developer access</Text>
            </h2>
            <Link href="/app/keys" className="text-link small">
              <Text> Manage </Text>
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="key-placeholder">
            <span>
              <Text>hg_live_</Text>
            </span>
            <span>••••••••••••••••</span>
          </div>
          <p>
            <Text> Create a key for each integration. </Text>
            <br />
            <Text> Full keys are shown only once. </Text>
          </p>
          <Link href="/docs" className="text-link small">
            <Text> Read the documentation </Text>
            <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </>
  );
}
