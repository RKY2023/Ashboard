import { loadMetric } from './metrics';

export type RuleOp = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';

export interface RuleCondition {
  metric: string;
  op: RuleOp;
  threshold: number;
}

const OPS: Record<RuleOp, (a: number, b: number) => boolean> = {
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
};

export interface EvaluationResult {
  ok: boolean;
  fired: boolean;
  value?: number;
  error?: string;
}

export function parseCondition(condition: Record<string, unknown> | undefined | null): RuleCondition | null {
  if (!condition) return null;
  const metric = condition.metric;
  const op = condition.op;
  const threshold = condition.threshold;
  if (typeof metric !== 'string' || typeof op !== 'string' || typeof threshold !== 'number') return null;
  if (!(op in OPS)) return null;
  return { metric, op: op as RuleOp, threshold };
}

export async function evaluateRule(
  householdId: string,
  condition: Record<string, unknown> | undefined | null
): Promise<EvaluationResult> {
  const parsed = parseCondition(condition);
  if (!parsed) return { ok: false, fired: false, error: 'invalid condition' };

  const value = await loadMetric(parsed.metric, householdId);
  if (value === null) return { ok: false, fired: false, error: `unknown metric: ${parsed.metric}` };

  const fired = OPS[parsed.op](value, parsed.threshold);
  return { ok: true, fired, value };
}
