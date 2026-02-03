import mongoose from 'mongoose';

const identitySchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    unique: true,
    required: false, // Will be set in pre-save hook
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field and format name before saving
identitySchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Format name to Title Case
  if (this.name) {
    this.name = this.name
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  next();
});

// Auto-increment uniqueId before saving a new document
// This must be defined before the model is created
identitySchema.pre('save', async function (next) {
  if (this.isNew && !this.uniqueId) {
    try {
      // Use this.constructor to get the model
      const IdentityModel = this.constructor;

      // Find all identities with uniqueId
      const allIdentities = await IdentityModel.find(
        { uniqueId: { $exists: true, $ne: null } }
      );

      let maxNumber = 0;

      // Extract the highest number from existing uniqueIds
      allIdentities.forEach((identity) => {
        if (identity.uniqueId) {
          // Handle both "PYIMS-X" format and old numeric format
          const match = identity.uniqueId.toString().match(/PYIMS-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          } else {
            // Handle old numeric format
            const num = parseInt(identity.uniqueId.toString(), 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      // Generate new uniqueId in PYIMS-X format
      this.uniqueId = `PYIMS-${maxNumber + 1}`;
    } catch (error) {
      console.error('Error generating uniqueId:', error);
      // Fallback: start with PYIMS-1 if there's any error
      this.uniqueId = 'PYIMS-1';
    }
  }
  next();
});

const Identity = mongoose.model('Identity', identitySchema, 'identities');

export default Identity;

