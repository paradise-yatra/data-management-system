import mongoose from 'mongoose';
import { getRecruitmentConnection } from '../config/db.js';

const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        default: ''
    },
    source: {
        type: String,
        trim: true,
        default: ''
    },
    currentPosition: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        default: 'New',
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

candidateSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Use the recruitment database connection
const db = getRecruitmentConnection();
const Candidate = db.model('Candidate', candidateSchema);

export default Candidate;
