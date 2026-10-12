'use client';
import { Text, useI18n } from '@/components/i18n';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { api, dateTime, usd, seconds } from '@/lib/api';
import type { Task } from '@/lib/types';
import { Modal } from './modal';
import { useWorkspace } from './workspace';
export function Status({ status }: { status: Task['status'] }) {
  const { t, locale } = useI18n();

  return (
    <span className={`status status-${status}`}>
      <i />
      <Text>
        {status === 'succeeded' ? 'Solved' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </span>
  );
}
export function TaskTable({ tasks, detailed = false }: { tasks: Task[]; detailed?: boolean }) {
  const { t, locale } = useI18n();

  const { user } = useWorkspace();
  const [selected, setSelected] = useState<Task | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function inspect(task: Task) {
    setError('');
    setLoading(true);
    setSelected(task);
    try {
      setSelected(await api<Task>(`/tasks/${task.id}`));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load the task.');
    } finally {
      setLoading(false);
    }
  }
  if (!tasks.length)
    return (
      <div className="empty-state">
        <span className="empty-mark">↗</span>
        <h3>
          <Text>No tasks yet.</Text>
        </h3>
        <p>
          <Text>Once you send a task, its status and result will appear in your workspace.</Text>
        </p>
        <a href="/docs" className="text-link">
          <Text> Read the quick start </Text>
          <ArrowUpRight size={14} />
        </a>
      </div>
    );
  return (
    <>
      <div className="table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th>
                <Text>Task ID</Text>
              </th>
              <th>
                <Text>Type</Text>
              </th>
              <th>
                <Text>Status</Text>
              </th>
              <th>
                <Text>Time</Text>
              </th>
              {detailed && (
                <>
                  <th>
                    <Text>Cost</Text>
                  </th>
                  <th>
                    <Text>Created</Text>
                  </th>
                  <th>
                    <span className="sr-only">
                      <Text>Details</Text>
                    </span>
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <button className="task-id" title={task.id} onClick={() => void inspect(task)}>
                    {task.id.slice(0, 8)}
                    <span>…</span>
                  </button>
                </td>
                <td>
                  <Text>hCaptcha</Text>
                </td>
                <td>
                  <Status status={task.status} />
                </td>
                <td>{task.durationMs === null ? '—' : seconds(task.durationMs, locale)}</td>
                {detailed && (
                  <>
                    <td>{usd(task.cost, 4)}</td>
                    <td>{dateTime(task.createdAt, user.timezone, locale)}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={t(`View task ${task.id.slice(0, 8)}`)}
                        onClick={() => void inspect(task)}
                      >
                        <ChevronDown size={14} />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-heading">
              <h2 id="task-detail-title">
                <Text>Task details</Text>
              </h2>
              <button
                className="icon-button"
                aria-label={t('Close task details')}
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <dl className="task-details">
              <dt>
                <Text>ID</Text>
              </dt>
              <dd>{selected.id}</dd>
              <dt>
                <Text>Website</Text>
              </dt>
              <dd>{selected.websiteURL}</dd>
              <dt>
                <Text>Status</Text>
              </dt>
              <dd>
                <Status status={selected.status} />
              </dd>
              <dt>
                <Text>Cost</Text>
              </dt>
              <dd>{usd(selected.cost, 4)}</dd>
              {selected.errorCode && (
                <>
                  <dt>
                    <Text>Error</Text>
                  </dt>
                  <dd>{selected.errorCode}</dd>
                </>
              )}
            </dl>
            {loading && (
              <p className="field-hint">
                <Text>Loading result…</Text>
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                <Text>{error}</Text>
              </p>
            )}
            {selected.result?.token && (
              <label>
                <Text> Result token </Text>
                <textarea readOnly value={selected.result.token} rows={4} />
              </label>
            )}
            {selected.status === 'succeeded' && !selected.result?.token && !loading && (
              <p className="field-hint">
                <Text>Result tokens expire after 24 hours.</Text>
              </p>
            )}
            <button className="button button-outline" onClick={() => setSelected(null)}>
              <Text> Close </Text>
            </button>
          </section>
        </Modal>
      )}
    </>
  );
}
