export type ReportAnswer =
  | null
  | number
  | boolean
  | ReportAnswer[]
  | { [key: string]: ReportAnswer };
export type SolveReport = {
  runId: string;
  status: string;
  serverAcceptance: string | null;
  solveMode: string;
  createdAt: string;
  finishedAt: string;
  expiresAt: string;
  durationMs: number | null;
  summary: {
    rounds: number;
    modelCalls: number;
    inputTokens: number;
    outputTokens: number;
    modelCostUsd: number | null;
    costComplete: boolean;
  };
  phases: { name: string; durationMs: number | null; count: number | null }[];
  models: {
    model: string;
    phase: string;
    durationMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: number | null;
    outcome: string;
  }[];
  rounds: {
    index: number;
    label: string;
    type: string;
    contractSource: string;
    attempts: number | null;
    actionMs: number | null;
    answer: ReportAnswer;
    observed: ReportAnswer;
    images: { id: number; label: string; overlay: boolean }[];
  }[];
};
export type AdminStats = {
  days: number;
  total: number;
  solved: number;
  failed: number;
  queued: number;
  processing: number;
  instant: number;
  challenge: number;
  unknown: number;
  successRate: number | null;
  averageMs: number | null;
  p95Ms: number | null;
  revenue: string;
  deposits: string;
  balance: string;
  users: number;
  activeUsers: number;
  newUsers: number;
  modelCostUsd: number | null;
  costCoverage: number;
  modelCalls: number;
  inputTokens: number;
  outputTokens: number;
  daily: { date: string; solved: number; failed: number }[];
  types: { type: string; total: number; solved: number; revenue: string }[];
  errors: { code: string; count: number }[];
};
export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  balance: string;
  createdAt: string;
  total: number;
  solved: number;
  failed: number;
  revenue: string;
  averageMs: number | null;
};
export type AdminTaskRow = {
  id: string;
  type: string;
  websiteURL: string;
  status: string;
  cost: string;
  createdAt: string;
  durationMs: number | null;
  errorCode: string | null;
  solveMode: string | null;
  user: { id: string; name: string };
};
