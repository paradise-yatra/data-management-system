import './server/env.js';
import mongoose from 'mongoose';
import { getVoyaTrailConnection } from './server/config/db.js';

async function check() {
    try {
        const conn = getVoyaTrailConnection();
        await new Promise((resolve) => {
            if (conn.readyState === 1) resolve();
            else conn.on('connected', resolve);
        });
        console.log('Connected to:', conn.host);
        console.log('Database name:', conn.name);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
check();
