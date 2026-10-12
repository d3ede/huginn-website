'use client';
import { Text, useI18n } from '@/components/i18n';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, LoaderCircle } from 'lucide-react';
import { TaskTable } from '@/components/task-table';
import { useWorkspace } from '@/components/workspace';
import { api } from '@/lib/api';
import type { Task } from '@/lib/types';
import { Modal } from '@/components/modal';
export default function TasksPage() {
  const { t, locale } = useI18n();

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
          <h1>
            <Text> Every task. </Text>
            <br className="mobile-break" />{' '}
            <em>
              <Text>In view.</Text>
            </em>
          </h1>
          <p>
            <Text>Follow a task from submission to result.</Text>
          </p>
        </div>
        <button
          className="button button-primary button-small"
          onClick={() => {
            setError('');
            setModal(true);
          }}
        >
          <Plus size={16} />
          <Text> New task </Text>
        </button>
      </header>
      {!config.solverAvailable && (
        <div className="notice">
          <Text>
            {' '}
            Task processing is not enabled yet. You can prepare your API integration; no tasks will
            be charged until processing is available.{' '}
          </Text>
        </div>
      )}
      <div className="table-toolbar">
        <label>
          <span className="sr-only">
            <Text>Filter by status</Text>
          </span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">
              <Text>All statuses</Text>
            </option>
            <option value="succeeded">
              <Text>Solved</Text>
            </option>
            <option value="failed">
              <Text>Failed</Text>
            </option>
            <option value="queued">
              <Text>Queued</Text>
            </option>
            <option value="processing">
              <Text>Processing</Text>
            </option>
          </select>
        </label>
        <span className="muted">
          <Text>{data ? `${data.total} tasks` : 'Loading…'}</Text>
        </span>
        <button
          className="icon-button"
          onClick={() => setRevision((v) => v + 1)}
          aria-label={t('Refresh tasks')}
        >
          <RefreshCw size={15} />
        </button>
      </div>
      {error && !modal && (
        <p className="form-error" role="alert">
          <Text>{error}</Text>
        </p>
      )}
      <section className="workspace-panel full-panel">
        {data ? (
          <TaskTable tasks={data.tasks} detailed />
        ) : (
          <p className="panel-loading">
            <Text>{error ? 'Unable to load tasks.' : 'Loading tasks…'}</Text>
          </p>
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
              <h2 id="new-task-title">
                <Text>New hCaptcha task</Text>
              </h2>
              <button
                className="icon-button"
                aria-label={t('Close new task')}
                disabled={busy}
                onClick={() => setModal(false)}
              >
                ✕
              </button>
            </div>
            <p>
              <Text>Submit a task for an application you are authorized to automate.</Text>
            </p>
            <form onSubmit={submit}>
              <label>
                <Text> Website URL </Text>
                <input
                  name="websiteURL"
                  type="url"
                  placeholder={t('https://your-application.com')}
                  maxLength={2048}
                  required
                />
              </label>
              <label>
                <Text> hCaptcha site key </Text>
                <input
                  name="websiteKey"
                  placeholder={t('Your site key')}
                  maxLength={256}
                  required
                />
              </label>
              <p className="field-hint">
                <Text>
                  {' '}
                  The configured task price is reserved on acceptance. Failed tasks are
                  refunded.{' '}
                </Text>
              </p>
              {!config.solverAvailable && (
                <div className="notice">
                  <Text> Processing is currently unavailable. No balance will be charged. </Text>
                </div>
              )}
              {error && (
                <p className="form-error" role="alert">
                  <Text>{error}</Text>
                </p>
              )}
              <button className="button button-primary" disabled={busy || !config.solverAvailable}>
                <Text>{busy ? <LoaderCircle className="spin" size={16} /> : 'Submit task'}</Text>
              </button>
            </form>
          </section>
        </Modal>
      )}
    </>
  );
}
