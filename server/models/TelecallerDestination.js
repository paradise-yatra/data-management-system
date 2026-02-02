import mongoose from 'mongoose';
import { getTelecallingConnection } from '../config/db.js';

const connection = getTelecallingConnection();

const telecallerDestinationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const TelecallerDestination = connection.model('TelecallerDestination', telecallerDestinationSchema, 'telecaller_destinations');

export default TelecallerDestination;
