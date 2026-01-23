import mongoose from 'mongoose';

const trashSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    required: false,
  },
  name: {
    type: String,
    required: false,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  interests: {
    type: [String],
    default: [],
  },
  source: {
    type: String,
    required: true,
    trim: true,
  },
  remarks: {
    type: String,
    default: '',
    trim: true,
  },
  dateAdded: {
    type: String,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
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
trashSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Trash = mongoose.model('Trash', trashSchema, 'trash');

export default Trash;

