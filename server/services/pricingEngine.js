import Setting from '../models/Setting.js';

/**
 * Calculate cost for a single service item based on cost type
 * @param {Object} item - Service item with costType and baseCost
 * @param {Object} params - Calculation parameters (pax, nights, rooms, tripCount)
 * @returns {number} Calculated cost
 */
function calculateItemCost(item, params = {}) {
  const { costType, baseCost } = item;
  const { pax = 0, nights = 0, rooms = 0, tripCount = 1 } = params;

  switch (costType) {
    case 'per_person':
      return baseCost * pax;
    case 'per_night':
      return baseCost * nights * rooms;
    case 'per_vehicle':
      return baseCost * tripCount;
    case 'flat':
      return baseCost;
    default:
      return 0;
  }
}

/**
 * Calculate pricing for a single day
 * @param {Object} day - Day object with services
 * @param {Object} params - Calculation parameters (pax, nights, rooms)
 * @returns {Object} Day pricing breakdown
 */
export function calculateDayPricing(day, params = {}) {
  const { pax = { total: 0 }, nights = 0, rooms = 0 } = params;
  const totalPax = pax.total || (pax.adults || 0) + (pax.children || 0);

  let dayTotal = 0;
  const breakdown = {
    hotels: 0,
    activities: 0,
    transfers: 0,
    sightseeings: 0,
    otherServices: 0,
  };

  // Calculate hotel cost (if present)
  if (day.hotel) {
    breakdown.hotels = calculateItemCost(day.hotel, { nights, rooms });
    dayTotal += breakdown.hotels;
  }

  // Calculate activities cost
  if (day.activities && Array.isArray(day.activities)) {
    day.activities.forEach((activity) => {
      const cost = calculateItemCost(activity, { pax: totalPax });
      breakdown.activities += cost;
      dayTotal += cost;
    });
  }

  // Calculate transfers cost
  if (day.transfers && Array.isArray(day.transfers)) {
    day.transfers.forEach((transfer) => {
      const cost = calculateItemCost(transfer, { 
        tripCount: transfer.tripCount || 1 
      });
      breakdown.transfers += cost;
      dayTotal += cost;
    });
  }

  // Calculate sightseeings cost
  if (day.sightseeings && Array.isArray(day.sightseeings)) {
    day.sightseeings.forEach((sightseeing) => {
      const cost = calculateItemCost(sightseeing, { pax: totalPax });
      breakdown.sightseeings += cost;
      dayTotal += cost;
    });
  }

  // Calculate other services cost
  if (day.otherServices && Array.isArray(day.otherServices)) {
    day.otherServices.forEach((service) => {
      const cost = calculateItemCost(service, { 
        pax: totalPax,
        nights,
        rooms,
      });
      breakdown.otherServices += cost;
      dayTotal += cost;
    });
  }

  return {
    dayTotal: roundToTwoDecimals(dayTotal),
    breakdown,
  };
}

/**
 * Calculate full itinerary pricing
 * @param {Object} itinerary - Itinerary object
 * @param {number} markupPercentage - Markup percentage (optional, will fetch from settings if not provided)
 * @returns {Promise<Object>} Complete pricing breakdown
 */
export async function calculateItineraryPricing(itinerary, markupPercentage = null) {
  const { days = [], pax, nights, rooms, pricing = {} } = itinerary;

  // Get markup percentage from settings if not provided
  let markup = markupPercentage;
  if (markup === null || markup === undefined) {
    if (pricing.markup?.isCustom && pricing.markup?.percentage !== undefined) {
      markup = pricing.markup.percentage;
    } else {
      const defaultMarkupSetting = await Setting.findOne({ 
        key: 'default_markup_percentage' 
      });
      markup = defaultMarkupSetting?.value || 20;
    }
  }

  // Calculate total for all days
  let subtotal = 0;
  const dayBreakdowns = [];
  const totalBreakdown = {
    hotels: 0,
    activities: 0,
    transfers: 0,
    sightseeings: 0,
    otherServices: 0,
  };

  days.forEach((day) => {
    const dayPricing = calculateDayPricing(day, { pax, nights, rooms });
    dayBreakdowns.push(dayPricing);
    subtotal += dayPricing.dayTotal;

    // Aggregate breakdown
    totalBreakdown.hotels += dayPricing.breakdown.hotels;
    totalBreakdown.activities += dayPricing.breakdown.activities;
    totalBreakdown.transfers += dayPricing.breakdown.transfers;
    totalBreakdown.sightseeings += dayPricing.breakdown.sightseeings;
    totalBreakdown.otherServices += dayPricing.breakdown.otherServices;
  });

  // Round subtotal
  subtotal = roundToTwoDecimals(subtotal);

  // Calculate markup amount
  const markupAmount = roundToTwoDecimals(subtotal * (markup / 100));

  // Calculate total
  const total = roundToTwoDecimals(subtotal + markupAmount);

  return {
    subtotal,
    markup: {
      percentage: markup,
      amount: markupAmount,
      isCustom: pricing.markup?.isCustom || false,
    },
    total,
    currency: pricing.currency || 'INR',
    lastCalculatedAt: new Date(),
    calculationVersion: (pricing.calculationVersion || 0) + 1,
    breakdown: {
      byDay: dayBreakdowns,
      total: totalBreakdown,
    },
  };
}

/**
 * Recalculate and update itinerary pricing
 * @param {Object} itinerary - Itinerary document
 * @returns {Promise<Object>} Updated pricing object
 */
export async function recalculateItineraryPricing(itinerary) {
  // Check if itinerary is locked
  if (itinerary.lockedAt || ['sent', 'confirmed'].includes(itinerary.status)) {
    throw new Error('Cannot recalculate pricing for locked itinerary');
  }

  const pricing = await calculateItineraryPricing(itinerary);
  return pricing;
}

/**
 * Round number to 2 decimal places
 * @param {number} num - Number to round
 * @returns {number} Rounded number
 */
function roundToTwoDecimals(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}


