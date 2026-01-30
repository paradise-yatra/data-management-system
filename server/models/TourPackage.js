import mongoose from 'mongoose';
import { getVoyaTrailConnection } from '../config/db.js';

const tourPackageSchema = new mongoose.Schema(
    {
        title: {
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
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TourCategory',
            required: true,
        },
        locations: {
            type: [String],
            default: ["Delhi", "Agra", "Jaipur", "Varanasi"],
        },
        duration: {
            days: { type: Number, required: true },
            nights: { type: Number, default: 0 },
        },
        startingPrice: {
            type: Number,
            required: true,
        },
        priceUnit: {
            type: String,
            default: "per person",
        },
        // Overview
        overview: {
            title: String,
            description: String,
            durationLabel: String,
            groupSize: String,
            guide: String,
            languages: String,
        },
        highlights: [String],
        inclusions: [String],
        exclusions: [String],
        travelStyle: String,
        bestTimeToVisit: String,

        // Media
        mainImage: {
            type: String,
            default: '',
        },
        galleryImages: {
            type: [String],
            default: [],
        },
        images: {
            hero: {
                url: String,
                publicId: String,
            },
            gallery: [{
                url: String,
                publicId: String,
            }],
        },

        // Amenities
        amenityIds: [String],

        // Itinerary
        itinerary: [{
            dayNumber: Number,
            title: String,
            description: String,
            images: [String],
            experiences: [String],
            stay: {
                name: String,
                image: String,
                stars: Number,
                location: String,
                distances: {
                    airport: String,
                    railway: String,
                    cityHeart: String,
                },
                cuisine: String,
                facilities: [String],
            },
        }],

        faq: [{
            question: String,
            answer: String,
        }],
        notes: [String],

        seo: {
            metaTitle: String,
            metaDescription: String,
            metaKeywords: [String],
            canonicalUrl: String,
        },

        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },

        // Legacy fields mapping (optional, or remove if not needed)
        isActive: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const voyaTrailDb = getVoyaTrailConnection();
const TourPackage = voyaTrailDb.model('TourPackage', tourPackageSchema);

export default TourPackage;
