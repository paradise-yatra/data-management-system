import mongoose from 'mongoose';

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
        lowercase: true
    },
    source: {
        type: String,
        required: true,
        trim: true
    },
    currentPosition: {
        type: String,
        required: true,
        trim: true,
        description: "The role they are being considered for"
    },
    status: {
        type: String,
        enum: ['New', 'Shortlisted', 'Interview Scheduled', 'Hired', 'Rejected', 'On Hold'],
        default: 'New'
    }
}, {
    timestamps: true
});

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
