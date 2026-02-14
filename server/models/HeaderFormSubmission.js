import mongoose from 'mongoose';
import { getVoyaTrailConnection } from '../config/db.js';

const headerFormSubmissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
            default: '',
        },
        destination: {
            type: String,
            required: true,
            trim: true,
        },
        budget: {
            type: String,
            required: true,
            trim: true,
        },
        travelDate: {
            type: Date,
            required: true,
        },
        message: {
            type: String,
            trim: true,
            default: '',
        },
        newsletter: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['new', 'contacted', 'converted', 'closed'],
            default: 'new',
        },
        notes: {
            type: String,
            trim: true,
            default: '',
        },
        source: {
            type: String,
            default: 'website-header-form',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const voyaTrailDb = getVoyaTrailConnection();
const HeaderFormSubmission = voyaTrailDb.model('HeaderFormSubmission', headerFormSubmissionSchema, 'header-form-submissions');

export default HeaderFormSubmission;
