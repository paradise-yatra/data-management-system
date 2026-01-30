/**
 * App-wide list of resources (panels) for RBAC permission matrix.
 * Used by RBAC API and route guards. Keep in sync with frontend route-to-resource mapping.
 */
export const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard', path: '/', description: 'Main dashboard' },
  { key: 'data_management', label: 'Data Management', path: '/data-management', description: 'Client relationships & CRM data' },
  { key: 'hr_portal', label: 'HR Portal', path: '/human-resource-management', description: 'Human resource management' },
  { key: 'recruitment', label: 'Recruitment', path: '/human-resource-management/recruitment', description: 'Recruitment module' },
  { key: 'voya_trail', label: 'Voya Trail', path: '/voya-trail', description: 'Voya Trail dashboard' },
  { key: 'voya_trail_packages', label: 'Voya Trail – Packages', path: '/voya-trail/packages', description: 'Tour packages list' },
  { key: 'voya_trail_category', label: 'Voya Trail – Category', path: '/voya-trail/packages/category', description: 'Package categories' },
  { key: 'voya_trail_destinations', label: 'Voya Trail – Destinations', path: '/voya-trail/packages/destinations', description: 'Destinations' },
  { key: 'voya_trail_package_form', label: 'Voya Trail – Package Form', path: '/voya-trail/packages/new', description: 'Create/edit tour package' },
  { key: 'manage_users', label: 'Manage Users', path: '/users', description: 'User management' },
  { key: 'rbac_system', label: 'RBAC System', path: '/rbac', description: 'Role-based access control' },
];

export const ACCESS_LEVELS = ['none', 'view', 'edit', 'full'];

export function getResourceByKey(key) {
  return RESOURCES.find((r) => r.key === key);
}

export function getResourceByPath(path) {
  return RESOURCES.find((r) => path === r.path || path.startsWith(r.path + '/'));
}
