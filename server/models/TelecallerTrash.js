import mongoose from 'mongoose';
import { getTelecallingConnection } from '../config/db.js';

const connection = getTelecallingConnection();

const telecallerTrashSchema = new mongoose.Schema({
    originalId: mongoose.Schema.Types.ObjectId,
    leadData: Object,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    deletedAt: {
        type: Date,
        default: Date.now
    }
});

const TelecallerTrash = connection.model('TelecallerTrash', telecallerTrashSchema, 'telecaller_trash');

export default TelecallerTrash;
