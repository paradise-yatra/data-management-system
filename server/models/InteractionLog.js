import mongoose from 'mongoose';

const interactionLogSchema = new mongoose.Schema({
    candidateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    hrId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming there is a User model for HR/Admin
        required: true
    },
    type: {
        type: String,
        enum: ['Call', 'Message', 'Email', 'Note'],
        required: true
    },
    response: {
        type: String,
        trim: true
    },
    conclusion: {
        type: String,
        required: true,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    loggedAt: {
        type: Date,
        default: Date.now
    }
});

const InteractionLog = mongoose.model('InteractionLog', interactionLogSchema);
export default InteractionLog;
