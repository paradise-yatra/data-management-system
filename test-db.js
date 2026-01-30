import './server/env.js';
import mongoose from 'mongoose';
import { getVoyaTrailConnection } from './server/config/db.js';
import TourCategory from './server/models/TourCategory.js';

async function test() {
    try {
        console.log('Connecting to Voya-Trail DB...');
        const conn = getVoyaTrailConnection();

        await new Promise((resolve, reject) => {
            conn.on('connected', resolve);
            conn.on('error', reject);
            // If already connected
            if (conn.readyState === 1) resolve();
        });

        console.log('Connected! Fetching categories...');
        const categories = await TourCategory.find({});
        console.log(`Found ${categories.length} categories.`);

        console.log('Creating a test category...');
        const testCat = await TourCategory.create({
            name: 'Test Category ' + Date.now(),
            slug: 'test-category-' + Date.now(),
            description: 'Test description',
            isActive: true
        });
        console.log('Created category:', testCat);

        console.log('Deleting test category...');
        await TourCategory.findByIdAndDelete(testCat._id);
        console.log('Deleted successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

test();
