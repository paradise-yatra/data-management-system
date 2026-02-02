import mongoose from 'mongoose';
import { getTelecallingConnection } from '../config/db.js';

const connection = getTelecallingConnection();

const telecallerSourceSchema = new mongoose.Schema({
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

const TelecallerSource = connection.model('TelecallerSource', telecallerSourceSchema, 'telecaller_sources');

export default TelecallerSource;
