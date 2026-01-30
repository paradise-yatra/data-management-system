import mongoose from 'mongoose';
import { getVoyaTrailConnection } from '../config/db.js';

const tourCategorySchema = new mongoose.Schema(
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
        },
    },
    {
        timestamps: true,
    }
);

// Virtual for package count
tourCategorySchema.virtual('packageCount', {
    ref: 'TourPackage',
    localField: '_id',
    foreignField: 'category',
    count: true
});

const voyaTrailDb = getVoyaTrailConnection();
const TourCategory = voyaTrailDb.model('TourCategory', tourCategorySchema);

export default TourCategory;
