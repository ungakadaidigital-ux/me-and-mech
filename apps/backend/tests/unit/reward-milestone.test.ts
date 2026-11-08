import { describe, it, expect } from 'vitest';
import { RewardWorkerService } from '../../src/modules/referral/reward-worker.service';
import { REFERRAL } from '@me-and-mech/shared';

const milestone = (n: number) => (new RewardWorkerService() as any).milestoneForCount(n) as number | null;

describe('referral milestone detection (PKG-034, gated)', () => {
  it('fires exactly at 1, 3, 5 and 10 successful referrals', () => {
    expect([1, 3, 5, 10].map(milestone)).toEqual([1, 3, 5, 10]);
  });
  it('fires nothing between milestones, so a replay can never double-credit', () => {
    for (const n of [0, 2, 4, 6, 7, 8, 9, 11, 25]) expect(milestone(n)).toBeNull();
  });
  it('locked reward table: 15d / 30d / 60d / permanent 20%', () => {
    expect(REFERRAL.tiers[1]).toEqual({ rewardType: 'days_15', valueDays: 15 });
    expect(REFERRAL.tiers[3]).toEqual({ rewardType: 'month_1', valueDays: 30 });
    expect(REFERRAL.tiers[5]).toEqual({ rewardType: 'month_2', valueDays: 60 });
    expect(REFERRAL.tiers[10].rewardType).toBe('discount_20');
  });
});
