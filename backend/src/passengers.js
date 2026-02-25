/**
 * Synthetic passenger manifest generator for POC.
 * Generates a realistic-looking manifest of affected passengers for a disruption.
 * All data is synthetic — no PII/PHI.
 */

const FIRST_NAMES = [
  'Alice', 'Bob', 'Carlos', 'Diana', 'Erik', 'Fatima', 'George', 'Hannah',
  'Ivan', 'Julia', 'Kenji', 'Lina', 'Marcus', 'Nadia', 'Omar', 'Priya',
  'Quinn', 'Rosa', 'Stefan', 'Tanya', 'Umar', 'Vera', 'Wei', 'Xena', 'Yuki', 'Zara',
];

const LAST_NAMES = [
  'Anderson', 'Bauer', 'Chen', 'Diaz', 'Evans', 'Fischer', 'Garcia', 'Hoffman',
  'Ibrahim', 'Jensen', 'Kim', 'Lee', 'Martinez', 'Nguyen', 'Olsson', 'Patel',
  'Quinn', 'Rivera', 'Singh', 'Torres', 'Ueda', 'Voss', 'Wang', 'Xu', 'Yamamoto', 'Zhao',
];

const TIERS = ['Platinum', 'Gold', 'Silver', 'General'];
const TIER_WEIGHTS = [0.08, 0.15, 0.22, 0.55]; // ~8% Platinum, etc.

const SPECIAL_REQUIREMENTS = [
  null, null, null, null, null, // majority have none
  'Wheelchair assistance',
  'Unaccompanied minor',
  'Service animal',
  'Medical oxygen',
  'Bassinet seat',
];

/**
 * Pick a weighted random tier
 */
function pickTier() {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < TIERS.length; i++) {
    cumulative += TIER_WEIGHTS[i];
    if (r <= cumulative) return TIERS[i];
  }
  return 'General';
}

/**
 * Generate a synthetic passenger manifest for a disruption.
 *
 * @param {Object} opts
 * @param {string} opts.origin - Origin airport code
 * @param {string} opts.destination - Destination airport code
 * @param {string} opts.flightNumber - Original flight number
 * @param {string} opts.date - Flight date
 * @param {number} [opts.count=200] - Number of passengers to generate
 * @returns {Array<Object>} Array of passenger records
 */
function generateManifest({ origin, destination, flightNumber, date, count = 200 }) {
  const passengers = [];

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const tier = pickTier();
    const hasApp = Math.random() < 0.65; // 65% have the airline app
    const consentForProactive = hasApp && Math.random() < 0.85; // 85% of app users opted in
    const specialReq = SPECIAL_REQUIREMENTS[Math.floor(Math.random() * SPECIAL_REQUIREMENTS.length)];

    // Connection risk: ~20% of passengers have onward connections
    const hasConnection = Math.random() < 0.20;
    const connectionRisk = hasConnection
      ? {
          connectingFlight: `UA${1000 + Math.floor(Math.random() * 9000)}`,
          connectionAirport: destination,
          connectionTime: 30 + Math.floor(Math.random() * 120), // minutes
          atRisk: true,
        }
      : null;

    passengers.push({
      passengerId: `PAX-${String(i + 1).padStart(4, '0')}`,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      tier,
      hasApp,
      consentForProactive,
      specialRequirements: specialReq,
      connectionRisk,
      origin,
      destination,
      flightNumber,
      date,
      seatClass: tier === 'Platinum' ? 'Business' : (tier === 'Gold' ? 'Premium Economy' : 'Economy'),
    });
  }

  // Sort: Platinum first, then Gold, Silver, General
  const tierOrder = { Platinum: 0, Gold: 1, Silver: 2, General: 3 };
  passengers.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return passengers;
}

/**
 * Get a subset of passengers for a demo session (first Platinum + a few others).
 * Returns a "focus set" of ~5 passengers for the interactive demo.
 */
function getDemoFocusPassengers(manifest) {
  const platinum = manifest.filter((p) => p.tier === 'Platinum').slice(0, 2);
  const gold = manifest.filter((p) => p.tier === 'Gold').slice(0, 1);
  const general = manifest.filter((p) => p.tier === 'General').slice(0, 2);
  return [...platinum, ...gold, ...general];
}

module.exports = { generateManifest, getDemoFocusPassengers };
