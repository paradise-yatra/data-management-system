import mongoose from 'mongoose';
import { getVoyaTrailConnection } from '../config/db.js';

const destinationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    },
    {
        timestamps: true,
    }
);

// Add a virtual property for package count (will need to be populated separately or aggregated)
destinationSchema.virtual('packageCount').get(function () {
    return this._packageCount || 0;
});

destinationSchema.set('toJSON', { virtuals: true });
destinationSchema.set('toObject', { virtuals: true });

const voyaTrailDb = getVoyaTrailConnection();
const Destination = voyaTrailDb.model('Destination', destinationSchema);

export default Destination;
