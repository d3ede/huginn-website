'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useWorkspace } from '@/components/workspace';
import { TaskTable } from '@/components/task-table';
import { api, usd } from '@/lib/api';
import type { Stats } from '@/lib/types';
const ActivityChart = dynamic(() => import('@/components/activity-chart'), {
  ssr: false,
  loading: () => <div className="chart-placeholder">Loading chart…</div>,
});
export default function Dashboard() {
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
          <span className="eyebrow">OVERVIEW</span>
          <h1>
            A clearer view, <em>{user.name.split(' ')[0]}.</em>
          </h1>
          <p>Here’s what’s happening in your workspace.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Refresh dashboard"
          onClick={() => setRevision((v) => v + 1)}
        >
          <RefreshCw size={16} />
        </button>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="metrics">
        <div>
          <span>Available balance</span>
          <strong>{usd(stats?.balance ?? user.balance)}</strong>
          <Link href="/app/billing">
            Top up <ArrowRight size={14} />
          </Link>
        </div>
        <div>
          <span>Solutions · {days} days</span>
          <strong>{stats?.solved.toLocaleString() ?? '—'}</strong>
          <small>
            {stats ? `${stats.total.toLocaleString()} tasks submitted` : 'Loading usage'}
          </small>
        </div>
        <div>
          <span>Success rate</span>
          <strong>{stats?.successRate == null ? '—' : `${stats.successRate.toFixed(1)}%`}</strong>
          <small>Of completed tasks</small>
        </div>
        <div>
          <span>Average solve time</span>
          <strong>
            {stats?.averageMs == null ? '—' : `${(stats.averageMs / 1000).toFixed(1)}s`}
          </strong>
          <small>Successful tasks only</small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="workspace-panel activity-panel">
          <div className="panel-heading">
            <h2>Solutions over time</h2>
            <label className="period-label">
              <span className="sr-only">Chart period</span>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>
          </div>
          {stats ? (
            <ActivityChart data={stats.daily} />
          ) : (
            <div className="chart-placeholder">
              {error ? 'Unable to load activity.' : 'Loading activity…'}
            </div>
          )}
          <div className="chart-legend">
            <span>
              <i />
              Solved
            </span>
            <span>
              <i className="failed" />
              Failed
            </span>
            <small>UTC</small>
          </div>
        </section>
        <section className="workspace-panel types-panel">
          <div className="panel-heading">
            <h2>Task types</h2>
            <span className="muted">{days} days</span>
          </div>
          {stats?.types.length ? (
            <div className="type-bars">
              {stats.types.map((type) => (
                <div key={type.type}>
                  <div>
                    <span>hCaptcha</span>
                    <span>{type.count.toLocaleString()}</span>
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
              <p>{stats ? 'No tasks in this period.' : 'Loading task types…'}</p>
            </div>
          )}
          <div className="panel-bottom-note">
            One task type.
            <br />
            One considered integration.
          </div>
        </section>
        <section className="workspace-panel recent-panel">
          <div className="panel-heading">
            <h2>Recent tasks</h2>
            <Link href="/app/tasks" className="text-link small">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {stats ? (
            <TaskTable tasks={stats.recent} />
          ) : (
            <p className="panel-loading">Loading tasks…</p>
          )}
        </section>
        <section className="workspace-panel access-panel">
          <div className="panel-heading">
            <h2>Developer access</h2>
            <Link href="/app/keys" className="text-link small">
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="key-placeholder">
            <span>hg_live_</span>
            <span>••••••••••••••••</span>
          </div>
          <p>
            Create a key for each integration.
            <br />
            Full keys are shown only once.
          </p>
          <span className="eyebrow">REST API / V1</span>
          <Link href="/docs" className="text-link small">
            Read the documentation <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </>
  );
}
