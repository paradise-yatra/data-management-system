import dotenv from 'dotenv';
import { getRbacConnection } from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const conn = getRbacConnection();
    if (!conn) {
      console.error('RBAC connection not available. Check MONGODB_URI.');
      process.exit(1);
    }
    await conn.asPromise();
    console.log('Connected to RBAC database');

    // Admin credentials - change these!
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@paradiseyatra.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';

    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingAdmin) {
      console.log('Admin user already exists:', adminEmail);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    const adminRole = await Role.findOne({ name: 'Admin' });
    const admin = new User({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      name: adminName,
      role: 'admin',
      roleId: adminRole?._id ?? undefined,
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

