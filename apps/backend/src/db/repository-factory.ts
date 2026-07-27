import type { SupabaseClient } from '@supabase/supabase-js';
import { WorkshopRepository } from './repositories/workshop.repository';
import { CustomerRepository } from './repositories/customer.repository';
import { VehicleRepository } from './repositories/vehicle.repository';
import { JobCardRepository } from './repositories/job-card.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { ReferralCodeRepository, ReferralEntryRepository, RewardTransactionRepository } from './repositories/referral.repository';
import { VoiceSessionRepository } from '../modules/voice/voice-session.repository';
import { PushTokenRepository } from '../modules/engagement/push-token.repository';
import { InventoryRepository } from './repositories/inventory.repository';
import { ReportsRepository } from '../modules/reports/reports.repository';

/**
 * Bundles all repositories bound to a single client instance. Route
 * handlers should call `createRepositories(userScopedClient)` for normal
 * requests (RLS-enforced), and Edge Functions / workers should call
 * `createRepositories(adminClient)` explicitly — the call site should
 * always make it obvious which trust boundary is in play.
 */
export function createRepositories(client: SupabaseClient) {
  return {
    workshops: new WorkshopRepository(client),
    customers: new CustomerRepository(client),
    vehicles: new VehicleRepository(client),
    jobCards: new JobCardRepository(client),
    invoices: new InvoiceRepository(client),
    referralCodes: new ReferralCodeRepository(client),
    referralEntries: new ReferralEntryRepository(client),
    rewardTransactions: new RewardTransactionRepository(client),
    voiceSessions: new VoiceSessionRepository(client),
    pushTokens: new PushTokenRepository(client),
    inventory: new InventoryRepository(client),
    reports: new ReportsRepository(client),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
