'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import type { Stats } from '@/lib/types';
export default function ActivityChart({ data }: { data: Stats['daily'] }) {
  return (
    <div
      className="activity-chart"
      role="img"
      aria-label={`Daily solutions chart. ${data.reduce((s, d) => s + d.solved, 0)} solved and ${data.reduce((s, d) => s + d.failed, 0)} failed tasks in this period.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -24 }}>
          <CartesianGrid vertical={false} stroke="#222b2b" strokeDasharray="2 5" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              })
            }
            minTickGap={40}
            tick={{ fill: '#7d8b89', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: '#7d8b89', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#78958d0d' }}
            contentStyle={{
              background: '#141a1a',
              border: '1px solid #303b38',
              borderRadius: 6,
              fontSize: 12,
              color: '#e8edea',
            }}
            labelFormatter={(value) => `${value} · UTC`}
          />
          <Bar
            name="Solved"
            dataKey="solved"
            fill="#78958D"
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
          <Bar
            name="Failed"
            dataKey="failed"
            fill="#7f5656"
            radius={[2, 2, 0, 0]}
            maxBarSize={16}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
