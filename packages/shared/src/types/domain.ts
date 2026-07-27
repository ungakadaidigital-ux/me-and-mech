/**
 * Me & Mech — Core Domain Types
 * Mirrors the locked Supabase schema. This is the single source of truth
 * for shape — both apps/backend and apps/mobile import from here.
 * DO NOT redefine these shapes locally in either app.
 */

export type SubscriptionStatus = 'trial' | 'active' | 'grace' | 'read_only' | 'expired' | 'churned';
export type PlanType = 'monthly' | 'annual' | null;
export type WorkshopSize = 'solo' | 'small' | 'large';

export interface Workshop {
  id: string; // UUID — also the RLS partition key across the system
  phone: string; // E.164-ish, +91XXXXXXXXXX, unique, OTP login identifier
  shopName: string;
  ownerName: string;
  city: string;
  address?: string;
  gstNumber?: string; // optional; GST calculation logic deferred post-MVP
  upiId?: string;
  invoicePrefix: string; // e.g. "MG" — used to build invoice numbers like MG-2026-001
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string; // ISO 8601, generated as created_at + 30 days
  subscriptionEndsAt?: string;
  planType: PlanType;
  discountPermanent: boolean; // true once 10+ successful referrals reached
  offerShown: boolean; // Day 28 one-time upgrade offer, non-repeatable
  workshopSize?: WorkshopSize; // for adaptive engagement milestones
  createdAt: string;
}

export interface Customer {
  id: string;
  workshopId: string; // FK -> Workshop.id, RLS partition key
  name: string;
  phone: string;
  city?: string;
  notes?: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  workshopId: string;
  customerId: string;
  vehicleNumber: string; // TN01AB1234 format
  make?: string;
  model?: string;
  year?: number;
  fuelType?: string;
  colour?: string;
  createdAt: string;
}

export type JobCardStatus = 'draft' | 'in_progress' | 'invoiced' | 'paid';

export interface JobCardItem {
  id: string;
  jobCardId: string;
  itemType: 'labour' | 'part';
  description: string;
  quantity: number;
  rate: string; // string to preserve precision, per locked API convention
  amount: string;
}

export interface JobCard {
  id: string;
  workshopId: string;
  customerId: string;
  vehicleId: string;
  jobDate: string; // ISO date
  jobType: string;
  status: JobCardStatus;
  km?: number;
  notes?: string;
  items: JobCardItem[];
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';

export interface Invoice {
  id: string;
  workshopId: string;
  jobCardId: string;
  invoiceNumber: string; // e.g. MG-2025-001, workshop-prefixed
  gstAmount: string; // hardcoded "0" in MVP — post-MVP feature, do not implement CGST/SGST logic yet
  pdfUrl?: string;
  whatsappSent: boolean;
  sentAt?: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

// --- Referral system (finalized 3-table schema) ---

export interface ReferralCode {
  id: string;
  workshopId: string;
  code: string; // format MM-XXXXX
  isActive: boolean;
  revokedReason?: string;
  createdAt: string;
}

export type ReferralEntryStatus = 'pending' | 'success' | 'failed' | 'expired';

export interface ReferralEntry {
  id: string;
  referralCodeId: string;
  referrerWorkshopId: string;
  refereeWorkshopId: string; // unique — a workshop can only be referred once
  status: ReferralEntryStatus;
  refereeJobCount: number;
  abuseFlagged: boolean;
  createdAt: string;
  expiresAt: string; // createdAt + 7 days
  resolvedAt?: string;
}

export type RewardType = 'days_15' | 'month_1' | 'month_2' | 'discount_20';

export interface RewardTransaction {
  id: string;
  referralEntryId: string;
  workshopId: string; // the referrer being rewarded
  rewardType: RewardType;
  rewardValueDays?: number; // null for discount_20
  idempotencyKey: string;
  appliedAt: string;
  notificationSent: boolean;
}

// --- Voice / AI ---

export interface VoiceSession {
  id: string;
  workshopId: string;
  audioStorageUrl?: string; // deleted after 24hrs
  transcript?: string;
  confidence?: number;
  engine: 'sarvam_saarika_v2' | 'expo_speech_totext'; // paid vs. trial engine
  createdAt: string;
}
