import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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
sourceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Source = mongoose.model('Source', sourceSchema, 'sources');

export default Source;

