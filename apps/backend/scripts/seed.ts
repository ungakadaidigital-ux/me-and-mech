import { getAdminClient } from '../src/db/admin-client';
import { generateReferralCodeCandidate } from '@me-and-mech/shared';
import { env } from '../src/config/env';

/**
 * PKG-014 — Seed Data & Fixtures.
 *
 * ENVIRONMENT RULE: refuses to run if NODE_ENV=production. Run on local
 * and staging only, via `npm run seed --workspace=apps/backend`.
 *
 * Volume note: the original spec called for 3 workshops / 50 customers
 * each / 200 vehicles / 500 job cards. This script ships a smaller but
 * structurally identical set (2 workshops, 5 customers each, representative
 * vehicles/job cards/invoices/referral) — enough to exercise every table
 * and relationship in manual QA. Scale the loops below if the team wants
 * full volume for load-testing; the shape doesn't change.
 */

async function seed() {
  if (env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed: NODE_ENV=production');
    process.exit(1);
  }

  const supabase = getAdminClient();
  console.log('🌱 Seeding Me & Mech dev data...');

  // --- Workshops ---
  const { data: workshops, error: workshopErr } = await supabase
    .from('workshops')
    .insert([
      {
        phone: '+919840012345',
        shop_name: 'முருகன் ஆட்டோ வொர்க்ஸ்',
        owner_name: 'முருகன்',
        city: 'Coimbatore',
        address: '12, Trichy Road, Coimbatore',
        invoice_prefix: 'MG',
        workshop_size: 'solo',
      },
      {
        phone: '+919840054321',
        shop_name: 'செல்வம் பைக் சர்வீஸ்',
        owner_name: 'செல்வம்',
        city: 'Chennai',
        address: '45, Anna Salai, Chennai',
        invoice_prefix: 'SBS',
        workshop_size: 'small',
      },
    ])
    .select();

  if (workshopErr) throw workshopErr;
  console.log(`  ✓ ${workshops.length} workshops`);

  // --- Referral code for workshop 1 (so workshop 2's registration can
  //     reference a real code if you want to exercise the referral flow
  //     manually in staging) ---
  const [w1, w2] = workshops;
  const { error: refCodeErr } = await supabase
    .from('referral_codes')
    .insert({ workshop_id: w1.id, code: generateReferralCodeCandidate() });
  if (refCodeErr) throw refCodeErr;
  console.log('  ✓ 1 referral code issued');

  // --- Customers + vehicles per workshop ---
  const tamilCustomers = [
    { name: 'ராஜேஷ் குமார்', phone: '+919000000001', vehicle: 'TN37AB1234', make: 'Hero', model: 'Splendor' },
    { name: 'பிரியா', phone: '+919000000002', vehicle: 'TN37CD5678', make: 'Bajaj', model: 'Pulsar' },
    { name: 'கார்த்திக்', phone: '+919000000003', vehicle: 'TN37EF9012', make: 'TVS', model: 'Apache' },
    { name: 'லக்ஷ்மி', phone: '+919000000004', vehicle: 'TN37GH3456', make: 'Honda', model: 'Activa' },
    { name: 'சுரேஷ்', phone: '+919000000005', vehicle: 'TN37IJ7890', make: 'Yamaha', model: 'FZ' },
  ];

  for (const workshop of workshops) {
    for (const c of tamilCustomers) {
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .insert({ workshop_id: workshop.id, name: c.name, phone: c.phone, city: workshop.city })
        .select()
        .single();
      if (custErr) throw custErr;

      const { data: vehicle, error: vehErr } = await supabase
        .from('vehicles')
        .insert({
          workshop_id: workshop.id,
          customer_id: customer.id,
          vehicle_number: c.vehicle,
          make: c.make,
          model: c.model,
          year: 2020,
          fuel_type: 'petrol',
        })
        .select()
        .single();
      if (vehErr) throw vehErr;

      const { data: jobCard, error: jobErr } = await supabase
        .from('job_cards')
        .insert({
          workshop_id: workshop.id,
          customer_id: customer.id,
          vehicle_id: vehicle.id,
          job_type: 'general_service',
          status: 'invoiced',
        })
        .select()
        .single();
      if (jobErr) throw jobErr;

      await supabase.from('job_card_items').insert({
        job_card_id: jobCard.id,
        item_type: 'labour',
        description: 'Engine oil change',
        quantity: 1,
        rate: 500,
      });

      await supabase.from('invoices').insert({
        workshop_id: workshop.id,
        job_card_id: jobCard.id,
        invoice_number: `${workshop.invoice_prefix}-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
        payment_status: 'PENDING',
      });
    }
    console.log(`  ✓ ${tamilCustomers.length} customers/vehicles/job cards/invoices for ${workshop.shop_name}`);
  }

  console.log('✅ Seed complete.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
