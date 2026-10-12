'use client';
import { useState, useEffect } from 'react';
import { Plus, RefreshCw, LoaderCircle } from 'lucide-react';
import { TaskTable } from '@/components/task-table';
import { useWorkspace } from '@/components/workspace';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';
import { Modal } from '@/components/modal';
export default function TasksPage() {
  const { config, refreshUser } = useWorkspace();
  const [data, setData] = useState<{ tasks: Task[]; total: number; pageSize: number } | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setError('');
    setData(null);
    api<{ tasks: Task[]; total: number; pageSize: number }>(
      `/tasks?page=${page}${status ? `&status=${status}` : ''}`,
      { signal: abort.signal },
    )
      .then(setData)
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [page, status, revision]);
  useEffect(() => {
    if (!data?.tasks.some((t) => t.status === 'queued' || t.status === 'processing')) return;
    const interval = setInterval(() => setRevision((v) => v + 1), 5000);
    return () => clearInterval(interval);
  }, [data]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          type: 'hcaptcha',
          websiteURL: form.get('websiteURL'),
          websiteKey: form.get('websiteKey'),
        }),
      });
      setModal(false);
      setPage(1);
      setRevision((v) => v + 1);
      await refreshUser();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create task.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="workspace-page-heading">
        <div>
          <span className="eyebrow">TASK HISTORY</span>
          <h1>
            Every task.
            <br className="mobile-break" /> <em>In view.</em>
          </h1>
          <p>Follow a task from submission to result.</p>
        </div>
        <button
          className="button button-primary button-small"
          onClick={() => {
            setError('');
            setModal(true);
          }}
        >
          <Plus size={16} /> New task
        </button>
      </header>
      {!config.solverAvailable && (
        <div className="notice">
          Task processing is not enabled yet. You can prepare your API integration; no tasks will be
          charged until processing is available.
        </div>
      )}
      <div className="table-toolbar">
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="succeeded">Solved</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
          </select>
        </label>
        <span className="muted">{data ? `${data.total} tasks` : 'Loading…'}</span>
        <button
          className="icon-button"
          onClick={() => setRevision((v) => v + 1)}
          aria-label="Refresh tasks"
        >
          <RefreshCw size={15} />
        </button>
      </div>
      {error && !modal && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="workspace-panel full-panel">
        {data ? (
          <TaskTable tasks={data.tasks} detailed />
        ) : (
          <p className="panel-loading">{error ? 'Unable to load tasks.' : 'Loading tasks…'}</p>
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
      {modal && (
        <Modal onClose={() => setModal(false)} canClose={!busy}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-task-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-heading">
              <h2 id="new-task-title">New hCaptcha task</h2>
              <button
                className="icon-button"
                aria-label="Close new task"
                disabled={busy}
                onClick={() => setModal(false)}
              >
                ✕
              </button>
            </div>
            <p>Submit a task for an application you are authorized to automate.</p>
            <form onSubmit={submit}>
              <label>
                Website URL
                <input
                  name="websiteURL"
                  type="url"
                  placeholder="https://your-application.com"
                  maxLength={2048}
                  required
                />
              </label>
              <label>
                hCaptcha site key
                <input name="websiteKey" placeholder="Your site key" maxLength={256} required />
              </label>
              <p className="field-hint">
                The configured task price is reserved on acceptance. Failed tasks are refunded.
              </p>
              {!config.solverAvailable && (
                <div className="notice">
                  Processing is currently unavailable. No balance will be charged.
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button className="button button-primary" disabled={busy || !config.solverAvailable}>
                {busy ? <LoaderCircle className="spin" size={16} /> : 'Submit task'}
              </button>
            </form>
          </section>
        </Modal>
      )}
    </>
  );
}
