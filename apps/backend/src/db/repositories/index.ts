export * from './base.repository';
export * from './workshop.repository';
export * from './customer.repository';
export * from './vehicle.repository';
export * from './job-card.repository';
export * from './invoice.repository';
export * from './referral.repository';

/**
 * Scope note (PKG-013): this delivery covers the repositories needed by
 * the core service flow (workshop → customer → vehicle → job card →
 * invoice) plus the full referral system (business-critical, feeds the
 * GATED PKG-034). Inventory, notifications, and subscription repositories
 * ship alongside their respective feature modules in Part 4/5 — building
 * them now, ahead of the API routes that would exercise them, risks
 * guessing at query shapes those modules haven't specified yet.
 */
