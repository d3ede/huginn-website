'use client';
import { Text, useI18n } from '@/components/i18n';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { Stats } from '@/lib/types';
export default function ActivityChart({ data }: { data: Stats['daily'] }) {
  const { t, locale } = useI18n();
  if (!data.some((day) => day.solved || day.failed))
    return (
      <div className="activity-chart chart-empty">
        <Text>No tasks in this period.</Text>
      </div>
    );

  return (
    <div
      className="activity-chart"
      role="img"
      aria-label={t(
        `Daily solutions chart. ${data.reduce((s, d) => s + d.solved, 0)} solved and ${data.reduce((s, d) => s + d.failed, 0)} failed tasks in this period.`,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })
            }
            minTickGap={40}
            tick={{ fill: '#7d8b89', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#7d8b89', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={false}
            isAnimationActive={false}
            wrapperStyle={{ pointerEvents: 'none' }}
            contentStyle={{
              background: '#fff',
              border: '1px solid var(--strong-line)',
              borderRadius: 6,
              fontSize: 14,
              color: 'var(--text)',
              boxShadow: '0 4px 16px #10283712',
            }}
            labelStyle={{ color: 'var(--text)', marginBottom: 6 }}
            labelFormatter={(value) => `${value} · UTC`}
          />
          <Bar
            name={t('Solved')}
            dataKey="solved"
            fill="var(--blue)"
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            name={t('Failed')}
            dataKey="failed"
            fill="#7f5656"
            isAnimationActive={false}
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
