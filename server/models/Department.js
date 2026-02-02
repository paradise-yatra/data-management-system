import mongoose from 'mongoose';
import { getRbacConnection } from '../config/db.js';

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update the updatedAt field before saving
departmentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual to get member count
departmentSchema.virtual('memberCount', {
    ref: 'User',
    localField: '_id',
    foreignField: 'departmentId',
    count: true,
});

departmentSchema.set('toJSON', { virtuals: true });
departmentSchema.set('toObject', { virtuals: true });

const conn = getRbacConnection();
const Department = conn.model('Department', departmentSchema, 'departments');

export default Department;
