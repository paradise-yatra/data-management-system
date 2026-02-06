import Itinerary from '../models/Itinerary.js';

/**
 * Generate a unique itinerary number in format: ITN-YYYY-XXX
 * @returns {Promise<string>} Generated itinerary number
 */
export async function generateItineraryNumber() {
  const year = new Date().getFullYear();
  const prefix = `ITN-${year}-`;

  // Find the highest number for this year
  const lastItinerary = await Itinerary.findOne({
    itineraryNumber: { $regex: `^${prefix}` }
  })
    .sort({ itineraryNumber: -1 })
    .select('itineraryNumber')
    .lean();

  let nextNumber = 1;

  if (lastItinerary && lastItinerary.itineraryNumber) {
    const lastNumber = parseInt(lastItinerary.itineraryNumber.split('-')[2], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Format with leading zeros (e.g., 001, 002, ..., 999)
  const formattedNumber = nextNumber.toString().padStart(3, '0');
  return `${prefix}${formattedNumber}`;
}



