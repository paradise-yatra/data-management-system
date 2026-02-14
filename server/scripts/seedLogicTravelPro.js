import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { getParadiseYatraCRMConnection, getRbacConnection } from '../config/db.js';
import Place from '../models/Place.js';
import Trip from '../models/Trip.js';
import TripVersion from '../models/TripVersion.js';
import RouteCache from '../models/RouteCache.js';
import PlaceClosure from '../models/PlaceClosure.js';
import LogicRunLog from '../models/LogicRunLog.js';
import ItineraryDocument from '../models/ItineraryDocument.js';
import { seedDefaultItineraryBuilderSettings } from '../services/itineraryBuilderSettingsService.js';

dotenv.config();

const PLACE_SEED = [
  { name: 'Red Fort', category: 'SIGHTSEEING', coordinates: [77.241, 28.6562], opensAt: '09:00', closesAt: '17:00', avgDurationMin: 90 },
  { name: 'Qutub Minar', category: 'SIGHTSEEING', coordinates: [77.1855, 28.5244], opensAt: '07:00', closesAt: '17:00', avgDurationMin: 90 },
  { name: 'India Gate', category: 'RELAXATION', coordinates: [77.2295, 28.6129], opensAt: '06:00', closesAt: '22:00', avgDurationMin: 60 },
  { name: 'Akshardham Temple', category: 'SIGHTSEEING', coordinates: [77.2773, 28.6127], opensAt: '10:00', closesAt: '18:30', avgDurationMin: 120, closedDays: ['MONDAY'] },
  { name: 'Chandni Chowk Food Walk', category: 'FOOD', coordinates: [77.2249, 28.6505], opensAt: '11:00', closesAt: '22:00', avgDurationMin: 120 },
  { name: 'Taj Mahal', category: 'SIGHTSEEING', coordinates: [78.0421, 27.1751], opensAt: '06:00', closesAt: '18:00', avgDurationMin: 120, closedDays: ['FRIDAY'] },
  { name: 'Agra Fort', category: 'SIGHTSEEING', coordinates: [78.0211, 27.1795], opensAt: '06:00', closesAt: '18:00', avgDurationMin: 90 },
  { name: 'Mehtab Bagh', category: 'RELAXATION', coordinates: [78.0401, 27.1798], opensAt: '06:00', closesAt: '19:00', avgDurationMin: 60 },
  { name: 'Petha Tasting Tour', category: 'FOOD', coordinates: [78.0081, 27.2046], opensAt: '10:00', closesAt: '21:00', avgDurationMin: 60 },
  { name: 'Fatehpur Sikri', category: 'SIGHTSEEING', coordinates: [77.6666, 27.0937], opensAt: '06:00', closesAt: '18:00', avgDurationMin: 120 },
  { name: 'Amber Fort', category: 'SIGHTSEEING', coordinates: [75.8513, 26.9855], opensAt: '08:00', closesAt: '17:30', avgDurationMin: 120 },
  { name: 'City Palace Jaipur', category: 'SIGHTSEEING', coordinates: [75.8236, 26.9258], opensAt: '09:30', closesAt: '17:00', avgDurationMin: 90 },
  { name: 'Hawa Mahal', category: 'SIGHTSEEING', coordinates: [75.8267, 26.9239], opensAt: '09:00', closesAt: '17:00', avgDurationMin: 60 },
  { name: 'Jaipur Street Food Crawl', category: 'FOOD', coordinates: [75.8195, 26.9124], opensAt: '17:00', closesAt: '23:00', avgDurationMin: 120 },
  { name: 'Nahargarh Fort Sunset', category: 'RELAXATION', coordinates: [75.8153, 26.9373], opensAt: '10:00', closesAt: '18:00', avgDurationMin: 90 },
  { name: 'Marine Drive', category: 'RELAXATION', coordinates: [72.8233, 18.9435], opensAt: '06:00', closesAt: '23:00', avgDurationMin: 60 },
  { name: 'Gateway of India', category: 'SIGHTSEEING', coordinates: [72.8347, 18.922], opensAt: '07:00', closesAt: '23:00', avgDurationMin: 60 },
  { name: 'Elephanta Caves', category: 'ADVENTURE', coordinates: [72.9315, 18.9633], opensAt: '09:00', closesAt: '17:30', avgDurationMin: 180, closedDays: ['MONDAY'] },
  { name: 'Colaba Cafe Trail', category: 'FOOD', coordinates: [72.8329, 18.9218], opensAt: '09:00', closesAt: '23:00', avgDurationMin: 120 },
  { name: 'Sanjay Gandhi National Park', category: 'ADVENTURE', coordinates: [72.9106, 19.2147], opensAt: '07:30', closesAt: '18:30', avgDurationMin: 150 },
  { name: 'Baga Beach', category: 'RELAXATION', coordinates: [73.7517, 15.5653], opensAt: '06:00', closesAt: '22:00', avgDurationMin: 120 },
  { name: 'Fort Aguada', category: 'SIGHTSEEING', coordinates: [73.7644, 15.4921], opensAt: '08:30', closesAt: '17:30', avgDurationMin: 90 },
  { name: 'Dudhsagar Falls Trek', category: 'ADVENTURE', coordinates: [74.3148, 15.3144], opensAt: '07:00', closesAt: '16:00', avgDurationMin: 240 },
  { name: 'Fontainhas Heritage Walk', category: 'SIGHTSEEING', coordinates: [73.8303, 15.4989], opensAt: '09:00', closesAt: '18:00', avgDurationMin: 90 },
  { name: 'Goan Seafood Experience', category: 'FOOD', coordinates: [73.7629, 15.5416], opensAt: '12:00', closesAt: '23:00', avgDurationMin: 120 },
  { name: 'Dal Lake Shikara Ride', category: 'RELAXATION', coordinates: [74.8486, 34.1239], opensAt: '08:00', closesAt: '19:00', avgDurationMin: 90 },
  { name: 'Gulmarg Gondola', category: 'ADVENTURE', coordinates: [74.3832, 34.0489], opensAt: '09:00', closesAt: '17:00', avgDurationMin: 180 },
  { name: 'Pahalgam Valley Tour', category: 'ADVENTURE', coordinates: [75.3215, 34.0165], opensAt: '08:00', closesAt: '18:00', avgDurationMin: 240 },
  { name: 'Srinagar Old City Walk', category: 'SIGHTSEEING', coordinates: [74.809, 34.084], opensAt: '09:00', closesAt: '18:00', avgDurationMin: 120 },
  { name: 'Wazwan Culinary Session', category: 'FOOD', coordinates: [74.7973, 34.0826], opensAt: '13:00', closesAt: '22:00', avgDurationMin: 150 },
];

function waitForConnection(connection, label) {
  return new Promise((resolve, reject) => {
    if (!connection) {
      reject(new Error(`${label} connection is not available`));
      return;
    }

    if (connection.readyState === 1) {
      resolve();
      return;
    }

    connection.once('connected', () => resolve());
    connection.once('error', (error) => reject(error));
  });
}

async function resolveSeedUserId() {
  if (process.env.SEED_TRIP_USER_ID && mongoose.Types.ObjectId.isValid(process.env.SEED_TRIP_USER_ID)) {
    return new mongoose.Types.ObjectId(process.env.SEED_TRIP_USER_ID);
  }

  const rbacDb = getRbacConnection();
  await waitForConnection(rbacDb, 'RBAC');

  const user = await rbacDb.collection('users').findOne({ isActive: true }, { projection: { _id: 1 } });
  if (user?._id) {
    return user._id;
  }

  return new mongoose.Types.ObjectId();
}

function createSampleTripPayload(placeMap, userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day1Date = new Date(today);
  day1Date.setDate(day1Date.getDate() + 5);

  const day2Date = new Date(day1Date);
  day2Date.setDate(day2Date.getDate() + 1);

  const redFort = placeMap.get('Red Fort');
  const chandni = placeMap.get('Chandni Chowk Food Walk');
  const akshardham = placeMap.get('Akshardham Temple');
  const tajMahal = placeMap.get('Taj Mahal');
  const agraFort = placeMap.get('Agra Fort');
  const mehtab = placeMap.get('Mehtab Bagh');

  const day1Events = [redFort, chandni, akshardham]
    .filter(Boolean)
    .map((place, index) => ({
      placeId: place._id,
      order: index,
      startTime: null,
      endTime: null,
      travelTimeMin: 0,
      distanceKm: 0,
      validationStatus: 'VALID',
      validationReason: null,
      routeProvider: 'STATIC',
    }));

  const day2Events = [tajMahal, agraFort, mehtab]
    .filter(Boolean)
    .map((place, index) => ({
      placeId: place._id,
      order: index,
      startTime: null,
      endTime: null,
      travelTimeMin: 0,
      distanceKm: 0,
      validationStatus: 'VALID',
      validationReason: null,
      routeProvider: 'STATIC',
    }));

  return {
    userId,
    name: 'Golden Triangle Logic Test Trip',
    startDate: day1Date,
    endDate: day2Date,
    status: 'DRAFT',
    days: [
      {
        date: day1Date,
        dayIndex: 0,
        events: day1Events,
      },
      {
        date: day2Date,
        dayIndex: 1,
        events: day2Events,
      },
    ],
    createdBy: userId,
    updatedBy: userId,
  };
}

async function resetCollections() {
  await Promise.all([
    Place.deleteMany({}),
    Trip.deleteMany({}),
    TripVersion.deleteMany({}),
    RouteCache.deleteMany({}),
    PlaceClosure.deleteMany({}),
    LogicRunLog.deleteMany({}),
    ItineraryDocument.deleteMany({}),
  ]);
}

async function seedPlaces() {
  const operations = PLACE_SEED.map((seed) => ({
    updateOne: {
      filter: { name: seed.name },
      update: {
        $set: {
          name: seed.name,
          description: seed.description || `${seed.name} - seeded test place`,
          category: seed.category,
          location: {
            type: 'Point',
            coordinates: seed.coordinates,
          },
          avgDurationMin: seed.avgDurationMin,
          opensAt: seed.opensAt,
          closesAt: seed.closesAt,
          closedDays: seed.closedDays || [],
          priceDomestic: seed.priceDomestic || 0,
          priceForeigner: seed.priceForeigner || 0,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  await Place.bulkWrite(operations);
}

async function seedSampleTrip(userId) {
  const existing = await Trip.findOne({ name: 'Golden Triangle Logic Test Trip' }).lean();
  if (existing) {
    return { created: false, tripId: existing._id };
  }

  const places = await Place.find({ name: { $in: PLACE_SEED.map((item) => item.name) } }).lean();
  const placeMap = new Map(places.map((place) => [place.name, place]));
  const payload = createSampleTripPayload(placeMap, userId);
  const trip = await Trip.create(payload);
  return { created: true, tripId: trip._id };
}

async function run() {
  try {
    const resetFlag = process.argv.includes('--reset');
    const crmDb = getParadiseYatraCRMConnection();
    await waitForConnection(crmDb, 'Itinerary-Builder');

    console.log('Connected to Itinerary-Builder database');
    if (resetFlag) {
      console.log('Reset flag detected. Clearing LogicTravel Pro collections...');
      await resetCollections();
      console.log('Collections cleared');
    }

    await seedDefaultItineraryBuilderSettings();
    console.log('Default itinerary builder settings ensured');

    await seedPlaces();
    console.log(`Places seeded/updated: ${PLACE_SEED.length}`);

    const seedUserId = await resolveSeedUserId();
    const sampleTripResult = await seedSampleTrip(seedUserId);
    if (sampleTripResult.created) {
      console.log(`Sample trip created: ${sampleTripResult.tripId}`);
    } else {
      console.log(`Sample trip already exists: ${sampleTripResult.tripId}`);
    }

    console.log('LogicTravel Pro seed complete');
    process.exit(0);
  } catch (error) {
    console.error('LogicTravel Pro seed failed:', error);
    process.exit(1);
  }
}

run();
