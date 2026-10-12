'use client';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
  Maximize2,
} from 'lucide-react';
import { api, usd, seconds, dateTime } from '@/lib/api';
import { Text, useI18n } from './i18n';
import { useWorkspace } from './workspace';
import type {
  AdminStats,
  AdminUserRow,
  AdminTaskRow,
  SolveReport,
  ReportAnswer,
} from '@/lib/admin-types';
const ActivityChart = dynamic(() => import('./activity-chart'), {
  ssr: false,
  loading: () => (
    <div className="chart-placeholder">
      <Text>Loading chart…</Text>
    </div>
  ),
});
type Page<T> = { total: number; page: number; pageSize: number } & T;
function Pager({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="analytics-pager">
      <span>
        {page} / {Math.max(1, Math.ceil(total / 20))} · {total} <Text>records</Text>
      </span>
      <button
        className="icon-button"
        aria-label={t('Previous page')}
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        className="icon-button"
        aria-label={t('Next page')}
        disabled={page * 20 >= total}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
function Answer({ value }: { value: ReportAnswer }) {
  if (value === null) return <span className="muted">—</span>;
  if (typeof value === 'number' || typeof value === 'boolean')
    return <span className="answer-chip">{String(value)}</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ol className="answer-list">
        {value.map((item, i) => (
          <li key={i}>
            <Answer value={item} />
          </li>
        ))}
      </ol>
    ) : (
      <Text>No selections</Text>
    );
  const entries = Object.entries(value);
  return entries.length ? (
    <dl className="answer-fields">
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{key.replaceAll('_', ' ')}</dt>
          <dd>
            <Answer value={item} />
          </dd>
        </div>
      ))}
    </dl>
  ) : (
    <Text>No retained answer</Text>
  );
}
function Report({ taskId, close }: { taskId: string; close: () => void }) {
  const { locale, t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const lightbox = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ task: AdminTaskRow; report: SolveReport } | null>(null);
  const [error, setError] = useState('');
  const [round, setRound] = useState(0);
  const [image, setImage] = useState<{ id: number; label: string } | null>(null);
  const [view, setView] = useState<'all' | 'overlay'>('all');
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    api<{ task: AdminTaskRow; report: SolveReport }>(`/admin/tasks/${taskId}/report`, {
      signal: abort.signal,
    })
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [taskId]);
  useEffect(() => {
    if (image) lightbox.current?.showModal();
  }, [image]);
  const report = data?.report;
  const selected = report?.rounds[round];
  return (
    <dialog
      ref={dialog}
      className="report-dialog"
      aria-labelledby="report-title"
      onCancel={close}
      onClose={close}
    >
      <header className="report-toolbar">
        <div>
          <span className="eyebrow">
            <Text>Task report</Text>
          </span>
          <h2 id="report-title">{data?.task.user.name ?? t('Loading report…')}</h2>
        </div>
        <button className="icon-button" aria-label={t('Close report')} onClick={close}>
          <X size={20} />
        </button>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!report && !error && (
        <p role="status">
          <Text>Loading report…</Text>
        </p>
      )}
      {report && (
        <>
          <div className="report-identification">
            <code>{taskId}</code>
            <span>{dateTime(report.createdAt, locale)}</span>
            <span className="status-badge">
              {report.solveMode === 'challenge'
                ? t(data?.task.status === 'failed' ? 'Challenge run' : 'Challenge solved')
                : report.solveMode === 'instant'
                  ? t('Instant PASS')
                  : t('Unknown solve mode')}
            </span>
            <span>
              {t(
                report.status === 'token_received'
                  ? 'Token issued'
                  : report.status === 'verified_submission'
                    ? 'Submission accepted'
                    : report.status,
              )}
            </span>
            <span>
              <Text>Server acceptance</Text>:{' '}
              {t(
                report.serverAcceptance === 'accepted'
                  ? 'Accepted'
                  : report.serverAcceptance === 'not_observed' || !report.serverAcceptance
                    ? 'Not observed'
                    : report.serverAcceptance,
              )}
            </span>
          </div>
          <p className="muted report-site">{data?.task.websiteURL}</p>
          <div className="analytics-metrics report-metrics">
            {[
              [
                t('Solve time'),
                report.durationMs === null ? '—' : seconds(report.durationMs, locale),
              ],
              [t('Rounds'), report.summary.rounds],
              [t('Model calls'), report.summary.modelCalls],
              [
                t('Input / output tokens'),
                `${report.summary.inputTokens} / ${report.summary.outputTokens}`,
              ],
              [
                t('Model cost'),
                report.summary.modelCostUsd === null ? '—' : usd(report.summary.modelCostUsd, 6),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          {report.summary.modelCostUsd !== null && !report.summary.costComplete && (
            <p className="muted">
              <Text>Model cost is partial; some calls have no cost telemetry.</Text>
            </p>
          )}
          <div className="report-layout">
            <aside className="report-rounds">
              <h3>
                <Text>Rounds</Text>
              </h3>
              {report.rounds.map((item, i) => (
                <button
                  key={item.index}
                  aria-current={round === i ? 'step' : undefined}
                  onClick={() => {
                    setRound(i);
                    setView('all');
                  }}
                >
                  <strong>{i + 1}</strong>
                  <span>
                    {item.label}
                    <small>{item.type}</small>
                  </span>
                </button>
              ))}
              {!report.rounds.length && (
                <p className="muted">
                  <Text>No challenge rounds recorded.</Text>
                </p>
              )}
            </aside>
            <section className="report-round-content">
              {selected && (
                <>
                  <div className="admin-section-heading">
                    <div>
                      <h3>{selected.label}</h3>
                      <p>
                        {selected.type} · {selected.contractSource}
                        {selected.attempts !== null && (
                          <>
                            {' '}
                            · {selected.attempts} <Text>attempts</Text>
                          </>
                        )}
                      </p>
                    </div>
                    <label className="compact-select">
                      <Text>Images</Text>
                      <select value={view} onChange={(e) => setView(e.target.value as typeof view)}>
                        <option value="all">{t('All images')}</option>
                        <option value="overlay">{t('Answer overlays')}</option>
                      </select>
                    </label>
                  </div>
                  <div className="report-images">
                    {selected.images
                      .filter((item) => view === 'all' || item.overlay)
                      .map((item) => (
                        <button
                          className={item.overlay ? 'report-image overlay' : 'report-image'}
                          key={item.id}
                          onClick={() => setImage(item)}
                        >
                          {/* Authenticated evidence images are served by the platform API. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/admin/tasks/${taskId}/report/images/${item.id}`}
                            alt={item.label}
                            loading="lazy"
                          />
                          <span>
                            {item.label}
                            <Maximize2 size={14} />
                          </span>
                        </button>
                      ))}
                  </div>
                  {!selected.images.some((item) => view === 'all' || item.overlay) && (
                    <p className="muted">
                      <Text>No retained images.</Text>
                    </p>
                  )}
                  <div className="report-answers">
                    <section className="panel">
                      <h3>
                        <Text>Model selections</Text>
                      </h3>
                      <Answer value={selected.answer} />
                    </section>
                    <section className="panel">
                      <h3>
                        <Text>Observed interaction</Text>
                      </h3>
                      <Answer value={selected.observed} />
                      {selected.actionMs !== null && (
                        <p className="muted">{seconds(selected.actionMs, locale)}</p>
                      )}
                    </section>
                  </div>
                </>
              )}
            </section>
          </div>
          <details className="panel report-details" open>
            <summary>
              <Text>Timing breakdown</Text>
            </summary>
            <div className="phase-list">
              {report.phases.map((phase, i) => (
                <div key={i}>
                  <span>{phase.name.replaceAll('_', ' ').replaceAll('.', ' · ')}</span>
                  <meter
                    min="0"
                    max={Math.max(1, ...report.phases.map((p) => p.durationMs ?? 0))}
                    value={phase.durationMs ?? 0}
                  />
                  <strong>
                    {phase.durationMs === null ? '—' : seconds(phase.durationMs, locale)}
                  </strong>
                </div>
              ))}
            </div>
          </details>
          <details className="panel report-details">
            <summary>
              <Text>Model calls and usage</Text>
            </summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      'Model',
                      'Phase',
                      'Duration',
                      'Input tokens',
                      'Output tokens',
                      'Model cost',
                      'Outcome',
                    ].map((x) => (
                      <th key={x}>
                        <Text>{x}</Text>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.models.map((model, i) => (
                    <tr key={i}>
                      <td>{model.model}</td>
                      <td>{model.phase.replaceAll('_', ' ')}</td>
                      <td>{model.durationMs === null ? '—' : seconds(model.durationMs, locale)}</td>
                      <td>{model.inputTokens ?? '—'}</td>
                      <td>{model.outputTokens ?? '—'}</td>
                      <td>{model.costUsd === null ? '—' : usd(model.costUsd, 6)}</td>
                      <td>{model.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="muted">
            <Text>Evidence retained until</Text>{' '}
            {new Date(report.expiresAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })}{' '}
            · UTC
          </p>
        </>
      )}
      {image && (
        <dialog
          ref={lightbox}
          className="report-lightbox"
          aria-label={image.label}
          onCancel={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setImage(null);
          }}
        >
          <header>
            <span>{image.label}</span>
            <button
              autoFocus
              className="icon-button"
              aria-label={t('Close image')}
              onClick={() => setImage(null)}
            >
              <X size={22} />
            </button>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/admin/tasks/${taskId}/report/images/${image.id}`} alt={image.label} />
        </dialog>
      )}
    </dialog>
  );
}
export function AdminAnalytics() {
  const { user, config } = useWorkspace();
  const { locale, t } = useI18n();
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Page<{ users: AdminUserRow[] }> | null>(null);
  const [tasks, setTasks] = useState<Page<{ tasks: AdminTaskRow[] }> | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [status, setStatus] = useState('');
  const [mode, setMode] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setUserPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!user.isAdmin) return;
    const abort = new AbortController();
    setStats(null);
    setError('');
    const params = new URLSearchParams({
      days: String(days),
      ...(selected ? { userId: selected.id } : {}),
    });
    api<AdminStats>(`/admin/stats?${params}`, { signal: abort.signal })
      .then(setStats)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [days, selected, revision, user.isAdmin]);
  useEffect(() => {
    if (!user.isAdmin) return;
    const abort = new AbortController();
    setUsers(null);
    api<Page<{ users: AdminUserRow[] }>>(
      `/admin/users?days=${days}&page=${userPage}&search=${encodeURIComponent(query)}`,
      { signal: abort.signal },
    )
      .then(setUsers)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [days, userPage, query, revision, user.isAdmin]);
  useEffect(() => {
    if (!user.isAdmin) return;
    const abort = new AbortController();
    setTasks(null);
    const params = new URLSearchParams({
      days: String(days),
      page: String(taskPage),
      ...(selected ? { userId: selected.id } : {}),
      ...(status ? { status } : {}),
      ...(mode ? { mode } : {}),
    });
    api<Page<{ tasks: AdminTaskRow[] }>>(`/admin/tasks?${params}`, { signal: abort.signal })
      .then(setTasks)
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [days, selected, taskPage, status, mode, revision, user.isAdmin]);
  const product = (id: string) => config.taskProducts.find((p) => p.id === id)?.name ?? id;
  function choose(value: AdminUserRow | null) {
    setSelected(value);
    setTaskPage(1);
  }
  const count = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US');
  return (
    <section className="admin-analytics" aria-label={t('Statistics')}>
      <div className="analytics-toolbar">
        <div>
          <h2>{selected ? selected.name : t('Platform overview')}</h2>
          <p>{selected ? selected.email : t('Usage, performance and revenue · UTC')}</p>
        </div>
        <div className="analytics-actions">
          {selected && (
            <button className="button button-outline button-small" onClick={() => choose(null)}>
              <ArrowLeft size={15} />
              <Text>All users</Text>
            </button>
          )}
          <label className="compact-select">
            <Text>Period</Text>
            <select
              value={days}
              onChange={(e) => {
                setDays(Number(e.target.value));
                setTaskPage(1);
                setUserPage(1);
              }}
            >
              {[7, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d} {t('days')}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button"
            aria-label={t('Refresh statistics')}
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="analytics-metrics" aria-busy={!stats}>
        {[
          [
            t('Tasks submitted'),
            count(stats?.total),
            `${count(stats?.queued)} ${t('queued')} · ${count(stats?.processing)} ${t('processing')}`,
          ],
          [
            t('Success rate'),
            stats?.successRate == null ? '—' : `${stats.successRate.toFixed(1)}%`,
            `${count(stats?.solved)} ${t('Solved')} · ${count(stats?.failed)} ${t('Failed')}`,
          ],
          [
            t('Average solve time'),
            stats?.averageMs == null ? '—' : seconds(stats.averageMs, locale),
            `P95: ${stats?.p95Ms == null ? '—' : seconds(stats.p95Ms, locale)}`,
          ],
          [t('Task revenue'), stats ? usd(stats.revenue, 4) : '—', t('Charged successful tasks')],
          [
            t('Confirmed deposits'),
            stats ? usd(stats.deposits) : '—',
            t('Payments confirmed in this period'),
          ],
          [
            t('Current balance'),
            stats ? usd(stats.balance) : '—',
            t('Available funds, current snapshot'),
          ],
          [
            t('Active users'),
            count(stats?.activeUsers),
            `${count(stats?.users)} ${t('total accounts')} · ${count(stats?.newUsers)} ${t('new')}`,
          ],
          [
            t('Model cost'),
            stats?.modelCostUsd == null ? '—' : usd(stats.modelCostUsd, 6),
            `${count(stats?.costCoverage)} ${t('tasks with complete cost telemetry')}`,
          ],
        ].map(([label, value, note]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <h3>
            <Text>Solutions over time</Text>
          </h3>
          {stats ? (
            <ActivityChart data={stats.daily} />
          ) : (
            <div className="chart-placeholder">
              <Text>Loading chart…</Text>
            </div>
          )}
        </section>
        <section className="panel">
          <h3>
            <Text>Solution paths</Text>
          </h3>
          <p className="muted">
            <Text>Successful tasks only. Older tasks without telemetry stay unknown.</Text>
          </p>
          {(['instant', 'challenge', 'unknown'] as const).map((key) => (
            <button
              className="path-row"
              key={key}
              onClick={() => {
                setMode(key);
                setStatus('SUCCEEDED');
                setTaskPage(1);
              }}
            >
              <span>
                {t(
                  key === 'instant'
                    ? 'Instant PASS'
                    : key === 'challenge'
                      ? 'Challenge solved'
                      : 'Unknown solve mode',
                )}
              </span>
              <strong>{count(stats?.[key])}</strong>
              <meter min="0" max={Math.max(1, stats?.solved ?? 0)} value={stats?.[key] ?? 0} />
            </button>
          ))}
          <p className="muted">
            {count(stats?.modelCalls)} <Text>Model calls</Text> · {count(stats?.inputTokens)} /{' '}
            {count(stats?.outputTokens)} <Text>Input / output tokens</Text>
          </p>
        </section>
      </div>
      <div className="analytics-grid">
        <section className="panel">
          <h3>
            <Text>Task types</Text>
          </h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {['Task type', 'Tasks', 'Solved', 'Revenue'].map((x) => (
                    <th key={x}>
                      <Text>{x}</Text>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats?.types.map((row) => (
                  <tr key={row.type}>
                    <td>{product(row.type)}</td>
                    <td>{count(row.total)}</td>
                    <td>{count(row.solved)}</td>
                    <td>{usd(row.revenue, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <h3>
            <Text>Failure breakdown</Text>
          </h3>
          {stats?.errors.length ? (
            stats.errors.map((row) => (
              <div className="failure-row" key={row.code}>
                <code>{row.code}</code>
                <strong>{count(row.count)}</strong>
              </div>
            ))
          ) : (
            <p className="muted">
              <Text>No failures in this period.</Text>
            </p>
          )}
        </section>
      </div>
      <section className="panel analytics-users">
        <div className="admin-section-heading">
          <div>
            <h3>
              <Text>Users</Text>
            </h3>
            <p>
              <Text>Select a user to explore their statistics and tasks.</Text>
            </p>
          </div>
          <label className="analytics-search">
            <Search size={16} />
            <input
              type="search"
              aria-label={t('Search users')}
              placeholder={t('Search by name or email')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="table-scroll" aria-busy={!users}>
          <table>
            <thead>
              <tr>
                {[
                  'User',
                  'Current balance',
                  'Tasks',
                  'Success rate',
                  'Average solve time',
                  'Revenue',
                ].map((x) => (
                  <th key={x}>
                    <Text>{x}</Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.users.map((row) => (
                <tr key={row.id} className={selected?.id === row.id ? 'selected-row' : ''}>
                  <td>
                    <button className="user-drilldown" onClick={() => choose(row)}>
                      {row.name}
                      <small>{row.email}</small>
                    </button>
                  </td>
                  <td>{usd(row.balance)}</td>
                  <td>{count(row.total)}</td>
                  <td>
                    {row.solved + row.failed
                      ? `${((row.solved / (row.solved + row.failed)) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td>{row.averageMs === null ? '—' : seconds(row.averageMs, locale)}</td>
                  <td>{usd(row.revenue, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users && !users.users.length && (
          <p className="muted">
            <Text>No users found.</Text>
          </p>
        )}
        {users && <Pager page={userPage} total={users.total} setPage={setUserPage} />}
      </section>
      <section className="panel analytics-tasks">
        <div className="admin-section-heading">
          <h3>
            <Text>Tasks and reports</Text>
          </h3>
          <div className="analytics-actions">
            <label className="compact-select">
              <Text>Status</Text>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setTaskPage(1);
                }}
              >
                <option value="">{t('All statuses')}</option>
                {['QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED'].map((x) => (
                  <option key={x} value={x}>
                    {t(x.toLowerCase())}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-select">
              <Text>Solve mode</Text>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value);
                  setTaskPage(1);
                }}
              >
                <option value="">{t('All modes')}</option>
                <option value="instant">{t('Instant PASS')}</option>
                <option value="challenge">{t('Challenge solved')}</option>
                <option value="unknown">{t('Unknown solve mode')}</option>
              </select>
            </label>
          </div>
        </div>
        <div className="table-scroll" aria-busy={!tasks}>
          <table>
            <thead>
              <tr>
                {[
                  'User',
                  'Task type',
                  'Website',
                  'Status',
                  'Solve mode',
                  'Duration',
                  'Cost',
                  'Report',
                ].map((x) => (
                  <th key={x}>
                    <Text>{x}</Text>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks?.tasks.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.user.name}
                    <small className="table-subtext">{dateTime(row.createdAt, locale)}</small>
                  </td>
                  <td>{product(row.type)}</td>
                  <td className="website-cell" title={row.websiteURL}>
                    {new URL(row.websiteURL).hostname}
                  </td>
                  <td>
                    <span className={`status status-${row.status.toLowerCase()}`}>
                      {t(row.status.toLowerCase())}
                    </span>
                    {row.errorCode && <small className="table-subtext">{row.errorCode}</small>}
                  </td>
                  <td>
                    {t(
                      row.solveMode === 'challenge'
                        ? row.status === 'FAILED'
                          ? 'Challenge run'
                          : 'Challenge solved'
                        : row.solveMode === 'instant'
                          ? 'Instant PASS'
                          : 'Unknown solve mode',
                    )}
                  </td>
                  <td>{row.durationMs === null ? '—' : seconds(row.durationMs, locale)}</td>
                  <td>{usd(row.cost, 4)}</td>
                  <td>
                    {['SUCCEEDED', 'FAILED'].includes(row.status) ? (
                      <button
                        className="button button-outline button-small"
                        onClick={() => setTaskId(row.id)}
                      >
                        <Text>View report</Text>
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tasks && !tasks.tasks.length && (
          <p className="muted">
            <Text>No tasks in this period.</Text>
          </p>
        )}
        {tasks && <Pager page={taskPage} total={tasks.total} setPage={setTaskPage} />}
      </section>
      {taskId && <Report key={taskId} taskId={taskId} close={() => setTaskId(null)} />}
    </section>
  );
}
