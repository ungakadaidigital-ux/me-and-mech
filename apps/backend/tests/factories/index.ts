/**
 * PKG-054 — Test factories with Tamil fixtures. Plain objects, no DB.
 * Phones use the 9000000xxx range so they can never collide with a real number.
 */
let counter = 0;
const next = () => ++counter;

export function workshopFactory(overrides: Record<string, unknown> = {}) {
  const n = next();
  return {
    id: `workshop-${n}`,
    phone: `+919000000${String(n).padStart(3, '0')}`,
    shop_name: 'ரமேஷ் ஆட்டோ சர்வீஸ்',
    owner_name: 'கு. ரமேஷ்',
    city: 'Coimbatore',
    invoice_prefix: 'RAS',
    subscription_status: 'trial',
    ...overrides,
  };
}

export function customerFactory(workshopId: string, overrides: Record<string, unknown> = {}) {
  const n = next();
  return {
    id: `customer-${n}`,
    workshop_id: workshopId,
    name: 'முருகன்',
    phone: `+919100000${String(n).padStart(3, '0')}`,
    ...overrides,
  };
}

export function vehicleFactory(workshopId: string, customerId: string, overrides: Record<string, unknown> = {}) {
  const n = next();
  return {
    id: `vehicle-${n}`,
    workshop_id: workshopId,
    customer_id: customerId,
    vehicle_number: `TN37AB${String(1000 + n)}`,
    make: 'Hero',
    model: 'Splendor',
    ...overrides,
  };
}
