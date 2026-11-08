import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { trialGate } from '../../src/modules/voice/trial-gate';

function run(status: string | undefined) {
  const req = { auth: status ? { subscriptionStatus: status } : undefined } as unknown as Request;
  const next = vi.fn();
  trialGate(req, {} as Response, next);
  return next;
}

describe('voice trialGate (PKG-030 cost-control gate)', () => {
  it('blocks trial workshops with 402 ERR_VOICE_TRIAL_BLOCKED', () => {
    const err = run('trial').mock.calls[0][0];
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe('ERR_VOICE_TRIAL_BLOCKED');
  });
  it('lets active and grace workshops through', () => {
    expect(run('active')).toHaveBeenCalledWith();
    expect(run('grace')).toHaveBeenCalledWith();
  });
});
