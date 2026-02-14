import mongoose from 'mongoose';
import { getVoyaTrailConnection } from '../config/db.js';

const newsletterSubmissionSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    source: {
        type: String, // 'footer', 'travel-digest', 'community-section'
        default: 'unknown',
    },
    status: {
        type: String,
        enum: ['active', 'unsubscribed'],
        default: 'active',
    },
}, {
    timestamps: true
});

const voyaTrailDb = getVoyaTrailConnection();
const NewsletterSubmission = voyaTrailDb.model('NewsletterSubmission', newsletterSubmissionSchema, 'newsletter-submissions');

export default NewsletterSubmission;
