import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Admin credentials - change these!
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@paradiseyatra.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: adminName,
      role: 'admin',
      isActive: true,
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Role: admin');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  }
};

createAdmin();

