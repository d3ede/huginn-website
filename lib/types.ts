export type User = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  balance: string;
  createdAt: string;
};
export type Task = {
  id: string;
  type: string;
  websiteURL: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  cost: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  errorCode: string | null;
  result?: { token: string | null };
};
export type PublicConfig = {
  pricePerTask: string;
  currency: string;
  solverAvailable: boolean;
  paymentsAvailable: boolean;
  demoMode: boolean;
};
export type Stats = {
  days: number;
  timezone: string;
  balance: string;
  total: number;
  solved: number;
  successRate: number | null;
  averageMs: number | null;
  daily: { date: string; solved: number; failed: number }[];
  types: { type: string; count: number }[];
  recent: Task[];
};
