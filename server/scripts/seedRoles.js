import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { getRbacConnection } from '../config/db.js';
import Role from '../models/Role.js';
import { RESOURCES } from '../config/resources.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultPermissionsForManager = [
  { resourceKey: 'dashboard', accessLevel: 'full' },
  { resourceKey: 'data_management', accessLevel: 'full' },
  { resourceKey: 'hr_portal', accessLevel: 'full' },
  { resourceKey: 'recruitment', accessLevel: 'full' },
  { resourceKey: 'voya_trail', accessLevel: 'full' },
  { resourceKey: 'voya_trail_packages', accessLevel: 'full' },
  { resourceKey: 'voya_trail_category', accessLevel: 'full' },
  { resourceKey: 'voya_trail_destinations', accessLevel: 'full' },
  { resourceKey: 'voya_trail_package_form', accessLevel: 'full' },
  { resourceKey: 'manage_users', accessLevel: 'view' },
  { resourceKey: 'rbac_system', accessLevel: 'none' },
  { resourceKey: 'sales', accessLevel: 'full' },
  { resourceKey: 'telecaller_panel', accessLevel: 'full' },
  { resourceKey: 'telecaller_assigned', accessLevel: 'full' },
  { resourceKey: 'telecaller_transfer', accessLevel: 'full' },
];

const defaultPermissionsForUser = [
  { resourceKey: 'dashboard', accessLevel: 'view' },
  { resourceKey: 'data_management', accessLevel: 'view' },
  { resourceKey: 'hr_portal', accessLevel: 'view' },
  { resourceKey: 'recruitment', accessLevel: 'view' },
  { resourceKey: 'voya_trail', accessLevel: 'view' },
  { resourceKey: 'voya_trail_packages', accessLevel: 'view' },
  { resourceKey: 'voya_trail_category', accessLevel: 'view' },
  { resourceKey: 'voya_trail_destinations', accessLevel: 'view' },
  { resourceKey: 'voya_trail_package_form', accessLevel: 'none' },
  { resourceKey: 'manage_users', accessLevel: 'none' },
  { resourceKey: 'rbac_system', accessLevel: 'none' },
  { resourceKey: 'sales', accessLevel: 'view' },
  { resourceKey: 'telecaller_panel', accessLevel: 'view' },
  { resourceKey: 'telecaller_assigned', accessLevel: 'view' },
  { resourceKey: 'telecaller_transfer', accessLevel: 'none' },
];

async function seedRoles() {
  try {
    const conn = getRbacConnection();
    if (!conn) {
      console.error('RBAC connection not available. Check MONGODB_URI.');
      process.exit(1);
    }
    await conn.asPromise();

    const existingAdmin = await Role.findOne({ name: 'Admin' });
    if (existingAdmin) {
      console.log('Roles already seeded. Skipping.');
      process.exit(0);
    }

    await Role.create([
      {
        name: 'Admin',
        description: 'Full system access',
        permissions: RESOURCES.map((r) => ({ resourceKey: r.key, accessLevel: 'full' })),
        isSystem: true,
      },
      {
        name: 'Manager',
        description: 'Can manage most modules; view-only for user management',
        permissions: defaultPermissionsForManager,
        isSystem: false,
      },
      {
        name: 'User',
        description: 'View access to main modules',
        permissions: defaultPermissionsForUser,
        isSystem: false,
      },
    ]);

    console.log('Default roles seeded: Admin, Manager, User');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    const conn = getRbacConnection();
    if (conn) await conn.close();
    process.exit(0);
  }
}

seedRoles();
