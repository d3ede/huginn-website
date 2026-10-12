'use client';
import { useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { api, dateTime, usd } from '@/lib/api';
import type { Task } from '@/lib/types';
import { Modal } from './modal';
import { useWorkspace } from './workspace';
export function Status({ status }: { status: Task['status'] }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {status === 'succeeded' ? 'Solved' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
export function TaskTable({ tasks, detailed = false }: { tasks: Task[]; detailed?: boolean }) {
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
        <h3>Your first task starts here.</h3>
        <p>Once you send a task, its status and result will appear in your workspace.</p>
        <a href="/docs" className="text-link">
          Read the quick start <ArrowUpRight size={14} />
        </a>
      </div>
    );
  return (
    <>
      <div className="table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Time</th>
              {detailed && (
                <>
                  <th>Cost</th>
                  <th>Created</th>
                  <th>
                    <span className="sr-only">Details</span>
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
                <td>hCaptcha</td>
                <td>
                  <Status status={task.status} />
                </td>
                <td>
                  {task.durationMs === null ? '—' : `${(task.durationMs / 1000).toFixed(1)}s`}
                </td>
                {detailed && (
                  <>
                    <td>{usd(task.cost, 4)}</td>
                    <td>{dateTime(task.createdAt, user.timezone)}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`View task ${task.id.slice(0, 8)}`}
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
              <h2 id="task-detail-title">Task details</h2>
              <button
                className="icon-button"
                aria-label="Close task details"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>
            <dl className="task-details">
              <dt>ID</dt>
              <dd>{selected.id}</dd>
              <dt>Website</dt>
              <dd>{selected.websiteURL}</dd>
              <dt>Status</dt>
              <dd>
                <Status status={selected.status} />
              </dd>
              <dt>Cost</dt>
              <dd>{usd(selected.cost, 4)}</dd>
              {selected.errorCode && (
                <>
                  <dt>Error</dt>
                  <dd>{selected.errorCode}</dd>
                </>
              )}
            </dl>
            {loading && <p className="field-hint">Loading result…</p>}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {selected.result?.token && (
              <label>
                Result token
                <textarea readOnly value={selected.result.token} rows={4} />
              </label>
            )}
            {selected.status === 'succeeded' && !selected.result?.token && !loading && (
              <p className="field-hint">Result tokens expire after 24 hours.</p>
            )}
            <button className="button button-outline" onClick={() => setSelected(null)}>
              Close
            </button>
          </section>
        </Modal>
      )}
    </>
  );
}
