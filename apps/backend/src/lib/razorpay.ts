import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';
import { PRICING } from '@me-and-mech/shared';

/**
 * PKG-036 — Razorpay Subscription Module. GATED.
 */

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

export async function createRazorpayOrder(planType: 'monthly' | 'annual', workshopId: string) {
  const amountInPaise = (planType === 'monthly' ? PRICING.monthlyInr : PRICING.annualInr) * 100;

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `workshop_${workshopId}_${Date.now()}`,
      notes: { workshop_id: workshopId, plan_type: planType },
    }),
  });

  if (!response.ok) {
    throw new Error(`Razorpay order creation failed: ${response.status}`);
  }

  return response.json();
}
