import type { Question } from './types';

/** Computes SLA due date from a start time and SLA window in hours. */
export function computeSlaDueAt(from: Date, slaHours: number): Date {
  return new Date(from.getTime() + slaHours * 60 * 60 * 1000);
}

export function isSlaBreached(q: Pick<Question, 'status' | 'sla_due_at' | 'answered_at'>, now = new Date()): boolean {
  if (q.status === 'answered' || q.status === 'closed') {
    return q.answered_at != null && new Date(q.answered_at) > new Date(q.sla_due_at);
  }
  return now > new Date(q.sla_due_at);
}

/** Human-readable time remaining until SLA due, negative when breached. */
export function slaRemainingLabel(slaDueAt: string, now = new Date()): string {
  const diffMs = new Date(slaDueAt).getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return diffMs >= 0 ? label : `-${label}`;
}
