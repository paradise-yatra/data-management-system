import mongoose from 'mongoose';
import { getLeadsPoolConnection } from '../config/db.js';

const connection = getLeadsPoolConnection();

const poolLeadCommentSchema = new mongoose.Schema({
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PoolLead',
        required: true,
        index: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userName: {
        type: String,
        required: true,
        trim: true,
    },
    mentions: [{
        type: String,
    }],
    externalCommentId: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
        default: null,
    },
    sourceSystem: {
        type: String,
        enum: ['pool', 'telecaller'],
        default: 'pool',
    },
    sourceCommentId: {
        type: String,
        default: null,
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

poolLeadCommentSchema.index({ leadId: 1, createdAt: 1 });

poolLeadCommentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const PoolLeadComment = connection.model('PoolLeadComment', poolLeadCommentSchema, 'pool_lead_comments');

export default PoolLeadComment;
