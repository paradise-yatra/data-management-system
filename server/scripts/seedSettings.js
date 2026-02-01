import dotenv from 'dotenv';
import { getParadiseYatraCRMConnection } from '../config/db.js';
import Setting from '../models/Setting.js';

dotenv.config();

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

async function seedSettings() {
  try {
    const db = getParadiseYatraCRMConnection();
    
    if (!db) {
      console.error('Database connection not available');
      process.exit(1);
    }

    console.log('Seeding default settings...');

    for (const setting of defaultSettings) {
      const existing = await Setting.findOne({ key: setting.key });
      
      if (existing) {
        console.log(`Setting "${setting.key}" already exists, skipping...`);
      } else {
        await Setting.create(setting);
        console.log(`Created setting: ${setting.key}`);
      }
    }

    console.log('Settings seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding settings:', error);
    process.exit(1);
  }
}

seedSettings();


