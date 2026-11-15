import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSlaDueAt, isSlaBreached, slaRemainingLabel } from '../src/sla';

test('computeSlaDueAt adds hours', () => {
  const from = new Date('2026-01-01T10:00:00Z');
  assert.equal(computeSlaDueAt(from, 48).toISOString(), '2026-01-03T10:00:00.000Z');
  assert.equal(computeSlaDueAt(from, 4).toISOString(), '2026-01-01T14:00:00.000Z');
});

test('isSlaBreached for open questions depends on now vs due', () => {
  const now = new Date('2026-01-02T00:00:00Z');
  assert.equal(
    isSlaBreached({ status: 'open', sla_due_at: '2026-01-01T00:00:00Z', answered_at: null }, now),
    true,
  );
  assert.equal(
    isSlaBreached({ status: 'open', sla_due_at: '2026-01-03T00:00:00Z', answered_at: null }, now),
    false,
  );
});

test('isSlaBreached for answered questions compares answer time to due', () => {
  assert.equal(
    isSlaBreached({ status: 'answered', sla_due_at: '2026-01-01T00:00:00Z', answered_at: '2026-01-02T00:00:00Z' }),
    true,
  );
  assert.equal(
    isSlaBreached({ status: 'answered', sla_due_at: '2026-01-03T00:00:00Z', answered_at: '2026-01-02T00:00:00Z' }),
    false,
  );
});

test('slaRemainingLabel formats remaining and overdue time', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  assert.equal(slaRemainingLabel('2026-01-01T02:30:00Z', now), '2h 30m');
  assert.equal(slaRemainingLabel('2026-01-01T00:20:00Z', now), '20m');
  assert.equal(slaRemainingLabel('2025-12-31T22:00:00Z', now), '-2h 0m');
});
