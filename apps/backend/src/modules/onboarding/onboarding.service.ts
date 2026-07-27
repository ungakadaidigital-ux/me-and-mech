import { getAdminClient } from '../../db/admin-client';
import { ValidationError, AppError } from '../../lib/errors';
import { ErrorCode } from '@me-and-mech/shared';
import { randomUUID } from 'node:crypto';
import { encryptField } from '../../lib/encryption';

export interface OnboardingInput {
  phone: string; // normalized, already OTP-verified by the caller
  shopName: string;
  ownerName: string;
  city: string;
  address?: string;
  gstNumber?: string;
  invoicePrefix: string;
}

export interface OnboardingResult {
  userId: string;
  workshopId: string;
  referralCode: string;
}

/**
 * PKG-018 — Workshop Onboarding Flow — Backend.
 *
 * Two-phase, but only phase 2 needs to be atomic (and is — via the
 * create_workshop_onboarding RPC, migration 027):
 *   1. Ensure an auth identity exists for this phone (id generated here,
 *      since our `users.id` has no default — it's meant to mirror an auth
 *      identity, and this backend owns issuing it in the absence of GoTrue
 *      phone-auth actually creating the row for us).
 *   2. Call the RPC to atomically create workshop + user + subscription +
 *      referral_codes + audit_log + onboarding notification row.
 *
 * Referral code application (if the mechanic entered one) happens in a
 * SEPARATE call after this succeeds — see referral.service.ts (this
 * module intentionally does not reach into referral_entries; onboarding
 * and referral-attribution are different concerns with different failure
 * handling: a bad/expired referral code should never block onboarding).
 */
export async function onboardWorkshop(input: OnboardingInput): Promise<OnboardingResult> {
  if (!input.shopName?.trim()) throw new ValidationError('Shop name is required');
  if (!input.ownerName?.trim()) throw new ValidationError('Owner name is required');
  if (!input.city?.trim()) throw new ValidationError('City is required');
  if (!input.invoicePrefix?.trim()) throw new ValidationError('Invoice prefix is required');

  const supabase = getAdminClient();
  const userId = randomUUID();

  const { data, error } = await supabase.rpc('create_workshop_onboarding', {
    p_user_id: userId,
    p_phone: input.phone,
    p_shop_name: input.shopName.trim(),
    p_owner_name: input.ownerName.trim(),
    p_city: input.city.trim(),
    p_address: input.address ?? null,
    p_gst_number: input.gstNumber ? encryptField(input.gstNumber) : null,
    p_invoice_prefix: input.invoicePrefix.trim().toUpperCase(),
  });

  if (error) {
    if (error.code === '23505') {
      throw new ValidationError('A workshop with this phone number already exists');
    }
    throw new AppError(ErrorCode.INTERNAL, `Onboarding failed: ${error.message}`, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    userId,
    workshopId: row.workshop_id,
    referralCode: row.referral_code,
  };
}
