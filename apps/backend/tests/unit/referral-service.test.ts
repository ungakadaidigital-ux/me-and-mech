import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/lib/qstash', () => ({ enqueueInternalJob: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../src/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { ReferralService } from '../../src/modules/referral/referral.service';
import { enqueueInternalJob } from '../../src/lib/qstash';

const REFEREE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const REFERRER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function makeRepos() {
  return {
    referralCodes: { findActiveByCode: vi.fn(), findByWorkshop: vi.fn() },
    referralEntries: {
      create: vi.fn(),
      findPendingByReferee: vi.fn(),
      markSuccess: vi.fn(),
      countSuccessfulByReferrer: vi.fn(),
    },
    jobCards: { countSince: vi.fn() },
  };
}

function setup() {
  const user = makeRepos();
  const admin = makeRepos();
  const service = new ReferralService(user as never, admin as never);
  return { user, admin, service };
}

describe('ReferralService — trust boundary (migration 033)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applyCode looks up and creates through the ADMIN repos, never the user repos', async () => {
    const { user, admin, service } = setup();
    admin.referralCodes.findActiveByCode.mockResolvedValue({ id: 'code-1', workshopId: REFERRER });
    admin.referralEntries.create.mockResolvedValue({
      id: 'entry-1', status: 'pending', expiresAt: '2026-12-01T00:00:00Z', referrerWorkshopId: REFERRER,
    });

    await service.applyCode(REFEREE, 'MM-ABCDE');

    expect(admin.referralCodes.findActiveByCode).toHaveBeenCalledOnce();
    expect(admin.referralEntries.create).toHaveBeenCalledOnce();
    expect(user.referralCodes.findActiveByCode).not.toHaveBeenCalled();
    expect(user.referralEntries.create).not.toHaveBeenCalled();
  });

  it("applyCode never reveals the referrer's workshop id to the referee", async () => {
    const { admin, service } = setup();
    admin.referralCodes.findActiveByCode.mockResolvedValue({ id: 'code-1', workshopId: REFERRER });
    admin.referralEntries.create.mockResolvedValue({
      id: 'entry-1', status: 'pending', expiresAt: '2026-12-01T00:00:00Z', referrerWorkshopId: REFERRER,
    });

    const result = await service.applyCode(REFEREE, 'MM-ABCDE');

    expect(result).toEqual({ id: 'entry-1', status: 'pending', expiresAt: '2026-12-01T00:00:00Z' });
    expect(JSON.stringify(result)).not.toContain(REFERRER);
  });

  it('applyCode rejects your own code and an unknown code', async () => {
    const { admin, service } = setup();
    admin.referralCodes.findActiveByCode.mockResolvedValueOnce({ id: 'code-1', workshopId: REFEREE });
    await expect(service.applyCode(REFEREE, 'MM-ABCDE')).rejects.toThrow(/own referral code/);

    admin.referralCodes.findActiveByCode.mockResolvedValueOnce(null);
    await expect(service.applyCode(REFEREE, 'MM-ABCDE')).rejects.toThrow();
    expect(admin.referralEntries.create).not.toHaveBeenCalled();
  });

  it('getMyStatus reads only through the user (RLS) repos', async () => {
    const { user, admin, service } = setup();
    user.referralCodes.findByWorkshop.mockResolvedValue({ code: 'MM-ABCDE' });
    user.referralEntries.countSuccessfulByReferrer.mockResolvedValue(2);

    const status = await service.getMyStatus(REFERRER);

    expect(status).toEqual({ code: 'MM-ABCDE', successfulReferrals: 2 });
    expect(admin.referralCodes.findByWorkshop).not.toHaveBeenCalled();
    expect(admin.referralEntries.countSuccessfulByReferrer).not.toHaveBeenCalled();
  });

  it('checkAndMarkSuccess marks success via ADMIN repos and enqueues the reward worker once threshold is met', async () => {
    const { user, admin, service } = setup();
    admin.referralEntries.findPendingByReferee.mockResolvedValue({
      id: 'entry-1', createdAt: '2026-11-20T00:00:00Z', expiresAt: '2999-01-01T00:00:00Z',
    });
    admin.jobCards.countSince.mockResolvedValue(3);
    admin.referralEntries.markSuccess.mockResolvedValue({ id: 'entry-1' });

    await service.checkAndMarkSuccess(REFEREE);

    expect(admin.referralEntries.markSuccess).toHaveBeenCalledWith('entry-1', 3);
    expect(enqueueInternalJob).toHaveBeenCalledOnce();
    expect(user.referralEntries.findPendingByReferee).not.toHaveBeenCalled();
    expect(user.referralEntries.markSuccess).not.toHaveBeenCalled();
  });

  it('checkAndMarkSuccess does nothing below the threshold or after expiry', async () => {
    const { admin, service } = setup();
    admin.referralEntries.findPendingByReferee.mockResolvedValue({
      id: 'entry-1', createdAt: '2026-11-20T00:00:00Z', expiresAt: '2999-01-01T00:00:00Z',
    });
    admin.jobCards.countSince.mockResolvedValue(2);
    await service.checkAndMarkSuccess(REFEREE);
    expect(admin.referralEntries.markSuccess).not.toHaveBeenCalled();

    admin.referralEntries.findPendingByReferee.mockResolvedValue({
      id: 'entry-2', createdAt: '2020-01-01T00:00:00Z', expiresAt: '2020-01-08T00:00:00Z',
    });
    admin.jobCards.countSince.mockResolvedValue(9);
    await service.checkAndMarkSuccess(REFEREE);
    expect(admin.referralEntries.markSuccess).not.toHaveBeenCalled();
  });

  it('checkAndMarkSuccess never throws — a referral failure must not block job card creation', async () => {
    const { admin, service } = setup();
    admin.referralEntries.findPendingByReferee.mockRejectedValue(new Error('db down'));
    await expect(service.checkAndMarkSuccess(REFEREE)).resolves.toBeUndefined();
  });
});
