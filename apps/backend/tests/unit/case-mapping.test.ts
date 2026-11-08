import { describe, it, expect } from 'vitest';
import { rowToCamel, rowsToCamel, objectToSnake } from '../../src/lib/case-mapping';

describe('case-mapping (regression for the Part 4 snake_case/camelCase bug)', () => {
  it('converts snake_case row keys to camelCase', () => {
    const row = rowToCamel<{ jobCardId: string; paymentStatus: string }>({ job_card_id: 'j1', payment_status: 'PAID' });
    expect(row).toEqual({ jobCardId: 'j1', paymentStatus: 'PAID' });
  });
  it('returns null for a null row (maybeSingle with no match)', () => {
    expect(rowToCamel(null)).toBeNull();
  });
  it('maps arrays and tolerates null', () => {
    expect(rowsToCamel([{ a_b: 1 }, { a_b: 2 }])).toEqual([{ aB: 1 }, { aB: 2 }]);
    expect(rowsToCamel(null)).toEqual([]);
  });
  it('round-trips camelCase back to snake_case', () => {
    expect(objectToSnake({ workshopId: 'w1', gstNumber: 'x' })).toEqual({ workshop_id: 'w1', gst_number: 'x' });
  });
});
