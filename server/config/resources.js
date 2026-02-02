/**
 * App-wide list of resources (panels) for RBAC permission matrix.
 * Used by RBAC API and route guards. Keep in sync with frontend route-to-resource mapping.
 */
export const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard', path: '/', description: 'Main dashboard', category: 'General' },
  { key: 'data_management', label: 'Database', path: '/data-management', description: 'Client relationships & CRM data', category: 'General' },
  { key: 'voya_trail', label: 'Voya Trail', path: '/voya-trail', description: 'Voya Trail dashboard', category: 'Voya Trail' },
  { key: 'voya_trail_packages', label: 'Voya Trail – Packages', path: '/voya-trail/packages', description: 'Tour packages list', category: 'Voya Trail' },
  { key: 'voya_trail_category', label: 'Voya Trail – Category', path: '/voya-trail/packages/category', description: 'Package categories', category: 'Voya Trail' },
  { key: 'voya_trail_destinations', label: 'Voya Trail – Destinations', path: '/voya-trail/packages/destinations', description: 'Destinations', category: 'Voya Trail' },
  { key: 'voya_trail_package_form', label: 'Voya Trail – Package Form', path: '/voya-trail/packages/new', description: 'Create/edit tour package', category: 'Voya Trail' },
  { key: 'manage_users', label: 'Manage Users', path: '/users', description: 'User management', category: 'System' },
  { key: 'rbac_system', label: 'RBAC System', path: '/rbac', description: 'Role-based access control', category: 'System' },
  { key: 'sales', label: 'Sales Hub', path: '/sales', description: 'Sales management dashboard', category: 'Sales' },
  { key: 'itinerary_builder', label: 'Itinerary Builder', path: '/sales/itinerary-builder', description: 'Create and manage itineraries', category: 'Sales', subCategory: 'Itinerary' },
  { key: 'telecaller_panel', label: 'Telecaller Panel', path: '/sales/telecaller', description: 'Telecaller record management', category: 'Sales', subCategory: 'Telecaller' },
  { key: 'telecaller_logs', label: 'View Logs', path: '/sales/telecaller/logs', description: 'View telecaller logs', category: 'Sales', subCategory: 'Telecaller', isToggle: true },
  { key: 'telecaller_trash', label: 'View Trash', path: '/sales/telecaller/trash', description: 'View telecaller trash', category: 'Sales', subCategory: 'Telecaller', isToggle: true },
  { key: 'telecaller_transfer', label: 'Transfer Lead', path: '/sales/telecaller/transfer', description: 'Permission to transfer leads to other users', category: 'Sales', subCategory: 'Telecaller', isToggle: true },
  { key: 'telecaller_assigned', label: 'Assigned to Me', path: '/sales/telecaller/assigned', description: 'View leads assigned to current user', category: 'Sales', subCategory: 'General' },
];

export const ACCESS_LEVELS = ['none', 'view', 'edit', 'full'];

export function getResourceByKey(key) {
  return RESOURCES.find((r) => r.key === key);
}

export function getResourceByPath(path) {
  return RESOURCES.find((r) => path === r.path || path.startsWith(r.path + '/'));
}
