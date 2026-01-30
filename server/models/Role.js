import mongoose from 'mongoose';
import { getRbacConnection } from '../config/db.js';

const permissionSchema = new mongoose.Schema(
  {
    resourceKey: { type: String, required: true },
    accessLevel: { type: String, enum: ['none', 'view', 'full'], required: true },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    permissions: {
      type: [permissionSchema],
      default: [],
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const conn = getRbacConnection();
const Role = conn.model('Role', roleSchema, 'roles');

export default Role;
