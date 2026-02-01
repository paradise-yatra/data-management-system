import dotenv from 'dotenv';
import { getParadiseYatraCRMConnection } from '../config/db.js';
import CostItem from '../models/CostItem.js';
import City from '../models/City.js';
import Setting from '../models/Setting.js';
import Itinerary from '../models/Itinerary.js';
import { generateItineraryNumber } from '../utils/itineraryNumberGenerator.js';
import { calculateItineraryPricing } from '../services/pricingEngine.js';

dotenv.config();

// Mock Cities
const mockCities = [
  { name: 'Delhi', country: 'India' },
  { name: 'Agra', country: 'India' },
  { name: 'Jaipur', country: 'India' },
  { name: 'Varanasi', country: 'India' },
  { name: 'Mumbai', country: 'India' },
  { name: 'Goa', country: 'India' },
  { name: 'Kerala', country: 'India' },
  { name: 'Rajasthan', country: 'India' },
  { name: 'Udaipur', country: 'India' },
  { name: 'Jodhpur', country: 'India' },
  { name: 'Rishikesh', country: 'India' },
  { name: 'Manali', country: 'India' },
];

// Mock Cost Items
const mockCostItems = [
  // Hotels in Delhi
  { name: 'Taj Palace Hotel', type: 'hotel', destination: 'Delhi', costType: 'per_night', baseCost: 8000, description: '5-star luxury hotel in central Delhi' },
  { name: 'The Leela Palace', type: 'hotel', destination: 'Delhi', costType: 'per_night', baseCost: 12000, description: 'Premium 5-star hotel' },
  { name: 'ITC Maurya', type: 'hotel', destination: 'Delhi', costType: 'per_night', baseCost: 10000, description: 'Luxury hotel with excellent service' },
  { name: 'Hotel Taj Mahal', type: 'hotel', destination: 'Delhi', costType: 'per_night', baseCost: 6000, description: '4-star hotel near city center' },
  
  // Hotels in Agra
  { name: 'Taj Hotel Agra', type: 'hotel', destination: 'Agra', costType: 'per_night', baseCost: 7000, description: 'Hotel with Taj Mahal view' },
  { name: 'Oberoi Amarvilas', type: 'hotel', destination: 'Agra', costType: 'per_night', baseCost: 15000, description: 'Luxury hotel overlooking Taj Mahal' },
  { name: 'Hotel Clarks Shiraz', type: 'hotel', destination: 'Agra', costType: 'per_night', baseCost: 5000, description: 'Comfortable 4-star hotel' },
  
  // Hotels in Jaipur
  { name: 'Rambagh Palace', type: 'hotel', destination: 'Jaipur', costType: 'per_night', baseCost: 13000, description: 'Former royal palace converted to hotel' },
  { name: 'Jai Mahal Palace', type: 'hotel', destination: 'Jaipur', costType: 'per_night', baseCost: 9000, description: 'Heritage palace hotel' },
  { name: 'Hotel Pearl Palace', type: 'hotel', destination: 'Jaipur', costType: 'per_night', baseCost: 4500, description: 'Boutique hotel in old city' },
  
  // Hotels in Varanasi
  { name: 'Taj Ganges Varanasi', type: 'hotel', destination: 'Varanasi', costType: 'per_night', baseCost: 8000, description: 'Riverside luxury hotel' },
  { name: 'Hotel Surya', type: 'hotel', destination: 'Varanasi', costType: 'per_night', baseCost: 3500, description: 'Budget-friendly hotel near ghats' },
  
  // Transfers
  { name: 'Delhi Airport Transfer', type: 'transfer', destination: 'Delhi', costType: 'per_vehicle', baseCost: 2500, description: 'Airport pickup/drop service' },
  { name: 'Agra Transfer', type: 'transfer', destination: 'Agra', costType: 'per_vehicle', baseCost: 3000, description: 'City transfer service' },
  { name: 'Jaipur Transfer', type: 'transfer', destination: 'Jaipur', costType: 'per_vehicle', baseCost: 2800, description: 'City transfer service' },
  { name: 'Delhi to Agra Transfer', type: 'transfer', destination: 'Delhi', costType: 'per_vehicle', baseCost: 5000, description: 'Intercity transfer Delhi to Agra' },
  { name: 'Agra to Jaipur Transfer', type: 'transfer', destination: 'Agra', costType: 'per_vehicle', baseCost: 6000, description: 'Intercity transfer Agra to Jaipur' },
  { name: 'Jaipur to Delhi Transfer', type: 'transfer', destination: 'Jaipur', costType: 'per_vehicle', baseCost: 5500, description: 'Intercity transfer Jaipur to Delhi' },
  
  // Activities
  { name: 'Red Fort Guided Tour', type: 'activity', destination: 'Delhi', costType: 'per_person', baseCost: 1500, description: 'Guided tour of Red Fort with English speaking guide' },
  { name: 'Qutub Minar Visit', type: 'activity', destination: 'Delhi', costType: 'per_person', baseCost: 800, description: 'Entry ticket and guide for Qutub Minar' },
  { name: 'India Gate & Parliament Tour', type: 'activity', destination: 'Delhi', costType: 'per_person', baseCost: 1000, description: 'City tour covering major landmarks' },
  { name: 'Taj Mahal Sunrise Tour', type: 'activity', destination: 'Agra', costType: 'per_person', baseCost: 2000, description: 'Early morning Taj Mahal visit with guide' },
  { name: 'Agra Fort Tour', type: 'activity', destination: 'Agra', costType: 'per_person', baseCost: 1200, description: 'Guided tour of Agra Fort' },
  { name: 'Fatehpur Sikri Excursion', type: 'activity', destination: 'Agra', costType: 'per_person', baseCost: 1800, description: 'Day trip to Fatehpur Sikri' },
  { name: 'Amber Fort Tour', type: 'activity', destination: 'Jaipur', costType: 'per_person', baseCost: 1500, description: 'Elephant ride and fort tour' },
  { name: 'City Palace Jaipur', type: 'activity', destination: 'Jaipur', costType: 'per_person', baseCost: 1200, description: 'Palace tour with audio guide' },
  { name: 'Hawa Mahal Visit', type: 'activity', destination: 'Jaipur', costType: 'per_person', baseCost: 500, description: 'Entry to Hawa Mahal' },
  { name: 'Ganga Aarti Experience', type: 'activity', destination: 'Varanasi', costType: 'per_person', baseCost: 800, description: 'Evening Ganga Aarti ceremony' },
  { name: 'Boat Ride on Ganges', type: 'activity', destination: 'Varanasi', costType: 'per_person', baseCost: 600, description: 'Sunrise boat ride on Ganges' },
  
  // Sightseeings
  { name: 'Lotus Temple Visit', type: 'sightseeing', destination: 'Delhi', costType: 'per_person', baseCost: 200, description: 'Entry to Lotus Temple' },
  { name: 'Humayun Tomb', type: 'sightseeing', destination: 'Delhi', costType: 'per_person', baseCost: 600, description: 'UNESCO World Heritage Site' },
  { name: 'Jama Masjid Visit', type: 'sightseeing', destination: 'Delhi', costType: 'flat', baseCost: 500, description: 'Largest mosque in India' },
  { name: 'Itmad-ud-Daulah Tomb', type: 'sightseeing', destination: 'Agra', costType: 'per_person', baseCost: 400, description: 'Baby Taj - beautiful marble tomb' },
  { name: 'Mehtab Bagh', type: 'sightseeing', destination: 'Agra', costType: 'per_person', baseCost: 300, description: 'Sunset view of Taj Mahal' },
  { name: 'Jantar Mantar Jaipur', type: 'sightseeing', destination: 'Jaipur', costType: 'per_person', baseCost: 400, description: 'Astronomical observatory' },
  { name: 'Nahargarh Fort', type: 'sightseeing', destination: 'Jaipur', costType: 'per_person', baseCost: 500, description: 'Fort with panoramic city view' },
  
  // Other Services
  { name: 'India Tourist Visa', type: 'other', destination: 'Delhi', costType: 'per_person', baseCost: 5000, description: 'Visa processing service' },
  { name: 'Travel Insurance', type: 'other', destination: 'Delhi', costType: 'per_person', baseCost: 2000, description: 'Travel insurance coverage' },
  { name: 'SIM Card with Data', type: 'other', destination: 'Delhi', costType: 'flat', baseCost: 1500, description: 'Prepaid SIM card with 28GB data' },
  { name: 'Photography Service', type: 'other', destination: 'Agra', costType: 'flat', baseCost: 3000, description: 'Professional photography at Taj Mahal' },
];

// Mock Itineraries
const createMockItinerary = async (itineraryData) => {
  const itineraryNumber = await generateItineraryNumber();
  
  const itinerary = new Itinerary({
    ...itineraryData,
    itineraryNumber,
  });
  
  // Calculate pricing
  const pricing = await calculateItineraryPricing(itinerary, itineraryData.pricing?.markup?.percentage);
  itinerary.pricing = pricing;
  
  await itinerary.save();
  return itinerary;
};

async function seedDatabase() {
  try {
    const db = getParadiseYatraCRMConnection();
    
    if (!db) {
      console.error('Database connection not available');
      process.exit(1);
    }

    console.log('🌱 Starting database seeding...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('Clearing existing data...');
    await CostItem.deleteMany({});
    await City.deleteMany({});
    await Itinerary.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Seed Cities
    console.log('Seeding cities...');
    const cities = await City.insertMany(mockCities);
    console.log(`✅ Created ${cities.length} cities\n`);

    // Seed Cost Items
    console.log('Seeding cost items...');
    const costItems = await CostItem.insertMany(
      mockCostItems.map(item => ({
        ...item,
        currency: 'INR',
        isActive: true,
      }))
    );
    console.log(`✅ Created ${costItems.length} cost items\n`);

    // Seed Settings (if not exists)
    console.log('Seeding settings...');
    const defaultSettings = [
      {
        key: 'default_markup_percentage',
        value: 20,
        description: 'Default markup percentage applied to itinerary subtotals',
      },
      {
        key: 'currency',
        value: 'INR',
        description: 'Default currency for pricing',
      },
      {
        key: 'pricing_rounding',
        value: 'round',
        description: 'Rounding strategy for pricing calculations (none, round, ceil, floor)',
      },
    ];

    for (const setting of defaultSettings) {
      const existing = await Setting.findOne({ key: setting.key });
      if (!existing) {
        await Setting.create(setting);
        console.log(`  ✅ Created setting: ${setting.key}`);
      } else {
        console.log(`  ⏭️  Setting "${setting.key}" already exists, skipping...`);
      }
    }
    console.log('✅ Settings seeded\n');

    // Seed Sample Itineraries
    console.log('Seeding sample itineraries...');
    
    // Get some cost items for sample itineraries
    const delhiHotel = costItems.find(ci => ci.name === 'Taj Palace Hotel');
    const agraHotel = costItems.find(ci => ci.name === 'Taj Hotel Agra');
    const jaipurHotel = costItems.find(ci => ci.name === 'Rambagh Palace');
    
    const delhiTransfer = costItems.find(ci => ci.name === 'Delhi Airport Transfer');
    const delhiToAgra = costItems.find(ci => ci.name === 'Delhi to Agra Transfer');
    const agraToJaipur = costItems.find(ci => ci.name === 'Agra to Jaipur Transfer');
    
    const redFortTour = costItems.find(ci => ci.name === 'Red Fort Guided Tour');
    const tajTour = costItems.find(ci => ci.name === 'Taj Mahal Sunrise Tour');
    const amberFort = costItems.find(ci => ci.name === 'Amber Fort Tour');

    // Sample Itinerary 1: Golden Triangle (Draft)
    if (delhiHotel && agraHotel && jaipurHotel && delhiTransfer && delhiToAgra && agraToJaipur && redFortTour && tajTour && amberFort) {
      const startDate1 = new Date();
      startDate1.setDate(startDate1.getDate() + 30);
      const endDate1 = new Date(startDate1);
      endDate1.setDate(endDate1.getDate() + 5);

      await createMockItinerary({
        clientName: 'John Smith',
        clientEmail: 'john.smith@example.com',
        clientPhone: '+1-555-0123',
        destinations: ['Delhi', 'Agra', 'Jaipur'],
        travelDates: {
          startDate: startDate1,
          endDate: endDate1,
        },
        pax: {
          adults: 2,
          children: 0,
        },
        nights: 5,
        rooms: 1,
        days: [
          {
            dayNumber: 1,
            date: startDate1.toISOString().split('T')[0],
            hotel: {
              costItemId: delhiHotel._id,
              name: delhiHotel.name,
              costType: delhiHotel.costType,
              baseCost: delhiHotel.baseCost,
            },
            transfers: [{
              costItemId: delhiTransfer._id,
              name: delhiTransfer.name,
              costType: delhiTransfer.costType,
              baseCost: delhiTransfer.baseCost,
              tripCount: 1,
            }],
            activities: [{
              costItemId: redFortTour._id,
              name: redFortTour.name,
              costType: redFortTour.costType,
              baseCost: redFortTour.baseCost,
            }],
            sightseeings: [],
            otherServices: [],
            notes: 'Arrival in Delhi, airport pickup, city tour',
          },
          {
            dayNumber: 2,
            date: new Date(startDate1.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: delhiHotel._id,
              name: delhiHotel.name,
              costType: delhiHotel.costType,
              baseCost: delhiHotel.baseCost,
            },
            activities: [],
            transfers: [{
              costItemId: delhiToAgra._id,
              name: delhiToAgra.name,
              costType: delhiToAgra.costType,
              baseCost: delhiToAgra.baseCost,
              tripCount: 1,
            }],
            sightseeings: [],
            otherServices: [],
            notes: 'Transfer to Agra',
          },
          {
            dayNumber: 3,
            date: new Date(startDate1.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: agraHotel._id,
              name: agraHotel.name,
              costType: agraHotel.costType,
              baseCost: agraHotel.baseCost,
            },
            activities: [{
              costItemId: tajTour._id,
              name: tajTour.name,
              costType: tajTour.costType,
              baseCost: tajTour.baseCost,
            }],
            transfers: [{
              costItemId: agraToJaipur._id,
              name: agraToJaipur.name,
              costType: agraToJaipur.costType,
              baseCost: agraToJaipur.baseCost,
              tripCount: 1,
            }],
            sightseeings: [],
            otherServices: [],
            notes: 'Taj Mahal visit, transfer to Jaipur',
          },
          {
            dayNumber: 4,
            date: new Date(startDate1.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: jaipurHotel._id,
              name: jaipurHotel.name,
              costType: jaipurHotel.costType,
              baseCost: jaipurHotel.baseCost,
            },
            activities: [{
              costItemId: amberFort._id,
              name: amberFort.name,
              costType: amberFort.costType,
              baseCost: amberFort.baseCost,
            }],
            transfers: [],
            sightseeings: [],
            otherServices: [],
            notes: 'Amber Fort tour',
          },
          {
            dayNumber: 5,
            date: new Date(startDate1.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: jaipurHotel._id,
              name: jaipurHotel.name,
              costType: jaipurHotel.costType,
              baseCost: jaipurHotel.baseCost,
            },
            activities: [],
            transfers: [],
            sightseeings: [],
            otherServices: [],
            notes: 'Free day in Jaipur',
          },
        ],
        pricing: {
          markup: {
            percentage: 20,
            isCustom: false,
          },
        },
        status: 'draft',
      });
      console.log('  ✅ Created sample itinerary: Golden Triangle Tour (Draft)');
    }

    // Sample Itinerary 2: Family Trip (Sent)
    if (delhiHotel && delhiTransfer && redFortTour) {
      const startDate2 = new Date();
      startDate2.setDate(startDate2.getDate() + 60);
      const endDate2 = new Date(startDate2);
      endDate2.setDate(endDate2.getDate() + 3);

      const itinerary2 = await createMockItinerary({
        clientName: 'Sarah Johnson',
        clientEmail: 'sarah.j@example.com',
        clientPhone: '+44-20-7946-0958',
        destinations: ['Delhi'],
        travelDates: {
          startDate: startDate2,
          endDate: endDate2,
        },
        pax: {
          adults: 2,
          children: 2,
        },
        nights: 3,
        rooms: 2,
        days: [
          {
            dayNumber: 1,
            date: startDate2.toISOString().split('T')[0],
            hotel: {
              costItemId: delhiHotel._id,
              name: delhiHotel.name,
              costType: delhiHotel.costType,
              baseCost: delhiHotel.baseCost,
            },
            transfers: [{
              costItemId: delhiTransfer._id,
              name: delhiTransfer.name,
              costType: delhiTransfer.costType,
              baseCost: delhiTransfer.baseCost,
              tripCount: 1,
            }],
            activities: [],
            transfers: [],
            sightseeings: [],
            otherServices: [],
            notes: 'Arrival and check-in',
          },
          {
            dayNumber: 2,
            date: new Date(startDate2.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: delhiHotel._id,
              name: delhiHotel.name,
              costType: delhiHotel.costType,
              baseCost: delhiHotel.baseCost,
            },
            activities: [{
              costItemId: redFortTour._id,
              name: redFortTour.name,
              costType: redFortTour.costType,
              baseCost: redFortTour.baseCost,
            }],
            transfers: [],
            sightseeings: [],
            otherServices: [],
            notes: 'City tour with family',
          },
          {
            dayNumber: 3,
            date: new Date(startDate2.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            hotel: {
              costItemId: delhiHotel._id,
              name: delhiHotel.name,
              costType: delhiHotel.costType,
              baseCost: delhiHotel.baseCost,
            },
            activities: [],
            transfers: [{
              costItemId: delhiTransfer._id,
              name: delhiTransfer.name,
              costType: delhiTransfer.costType,
              baseCost: delhiTransfer.baseCost,
              tripCount: 1,
            }],
            sightseeings: [],
            otherServices: [],
            notes: 'Departure',
          },
        ],
        pricing: {
          markup: {
            percentage: 15,
            isCustom: true,
          },
        },
        status: 'sent',
        lockedAt: new Date(),
      });
      console.log('  ✅ Created sample itinerary: Family Delhi Trip (Sent)');
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Cities: ${cities.length}`);
    console.log(`   - Cost Items: ${costItems.length}`);
    console.log(`   - Sample Itineraries: 2`);
    console.log(`\n🎉 You can now use the Itinerary Builder with sample data!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

