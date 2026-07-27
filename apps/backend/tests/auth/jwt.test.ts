import { describe, it, expect } from 'vitest';

describe('jwt', () => {
  it('mints a token with the required RLS-relevant claims and verifies it back', async () => {
    const { mintAccessToken, verifyAccessToken } = await import('../../src/lib/jwt');

    const token = mintAccessToken({
      userId: 'user-123',
      workshopId: 'workshop-456',
      appRole: 'OWNER',
      subscriptionStatus: 'trial',
      trialEndsAt: '2026-08-26T00:00:00.000Z',
    });

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-123');
    expect(payload.role).toBe('authenticated'); // must be "authenticated" for PostgREST/RLS
    expect(payload.app_role).toBe('OWNER');
    expect(payload.workshop_id).toBe('workshop-456');
    expect(payload.aud).toBe('authenticated');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const { verifyAccessToken } = await import('../../src/lib/jwt');

    const forged = jwt.sign({ sub: 'attacker', role: 'authenticated' }, 'wrong-secret');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('onboarding proof tokens are rejected by verifyAccessToken (different claim shape/purpose)', async () => {
    const { mintOnboardingProof, verifyOnboardingProof } = await import('../../src/lib/jwt');

    const proof = mintOnboardingProof('+919000000000');
    const payload = verifyOnboardingProof(proof);
    expect(payload.type).toBe('onboarding_proof');
    expect(payload.phone).toBe('+919000000000');
  });
});
