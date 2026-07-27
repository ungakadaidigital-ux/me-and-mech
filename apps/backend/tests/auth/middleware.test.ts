import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';

function mockReqRes(overrides: Partial<Request> = {}) {
  const req = { headers: {}, ...overrides } as Request;
  const res = {} as Response;
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticate middleware', () => {
  it('rejects requests with no Authorization header', async () => {
    const { authenticate } = await import('../../src/middleware/authenticate');
    const { req, res, next } = mockReqRes();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });

  it('attaches req.auth for a valid token and calls next() with no error', async () => {
    const { mintAccessToken } = await import('../../src/lib/jwt');
    const { authenticate } = await import('../../src/middleware/authenticate');

    const token = mintAccessToken({
      userId: 'u1',
      workshopId: 'w1',
      appRole: 'OWNER',
      subscriptionStatus: 'active',
      trialEndsAt: null,
    });

    const { req, res, next } = mockReqRes({ headers: { authorization: `Bearer ${token}` } } as any);
    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(); // no error argument
    expect(req.auth?.workshopId).toBe('w1');
    expect(req.auth?.appRole).toBe('OWNER');
  });

  it('rejects a garbage token', async () => {
    const { authenticate } = await import('../../src/middleware/authenticate');
    const { req, res, next } = mockReqRes({ headers: { authorization: 'Bearer not-a-real-token' } } as any);

    authenticate(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});

describe('authorize (RBAC) middleware', () => {
  it('allows OWNER to perform invoice:delete', async () => {
    const { authorize } = await import('../../src/middleware/authorize');
    const { req, res, next } = mockReqRes({ auth: { appRole: 'OWNER' } } as any);

    authorize('invoice:delete')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks VIEWER from job_card:write', async () => {
    const { authorize } = await import('../../src/middleware/authorize');
    const { req, res, next } = mockReqRes({ auth: { appRole: 'VIEWER' } } as any);

    authorize('job_card:write')(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });

  it('blocks MECHANIC from subscription:manage', async () => {
    const { authorize } = await import('../../src/middleware/authorize');
    const { req, res, next } = mockReqRes({ auth: { appRole: 'MECHANIC' } } as any);

    authorize('subscription:manage')(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

describe('subscriptionGuard middleware', () => {
  it('allows a trial workshop through (zero degradation rule)', async () => {
    const { subscriptionGuard } = await import('../../src/middleware/subscription-guard');
    const { req, res, next } = mockReqRes({ auth: { subscriptionStatus: 'trial' } } as any);

    subscriptionGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a read_only workshop', async () => {
    const { subscriptionGuard } = await import('../../src/middleware/subscription-guard');
    const { req, res, next } = mockReqRes({ auth: { subscriptionStatus: 'read_only' } } as any);

    subscriptionGuard(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(402);
  });

  it('blocks an expired workshop', async () => {
    const { subscriptionGuard } = await import('../../src/middleware/subscription-guard');
    const { req, res, next } = mockReqRes({ auth: { subscriptionStatus: 'expired' } } as any);

    subscriptionGuard(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(402);
  });

  it('allows an active paid workshop', async () => {
    const { subscriptionGuard } = await import('../../src/middleware/subscription-guard');
    const { req, res, next } = mockReqRes({ auth: { subscriptionStatus: 'active' } } as any);

    subscriptionGuard(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });
});
