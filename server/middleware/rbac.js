import Role from '../models/Role.js';
import User from '../models/User.js';
import { RESOURCES } from '../config/resources.js';

/**
 * Legacy role default permissions when user has no roleId (migration fallback).
 * admin: all full; manager: view most, full on manage_users; user: view dashboard + limited.
 */
const LEGACY_DEFAULT_PERMISSIONS = {
  admin: null, // null = isSystem-like, all full
  manager: {
    dashboard: 'full',
    data_management: 'full',
    hr_portal: 'full',
    recruitment: 'full',
    voya_trail: 'full',
    voya_trail_packages: 'full',
    voya_trail_category: 'full',
    voya_trail_destinations: 'full',
    voya_trail_package_form: 'full',
    manage_users: 'view',
    rbac_system: 'none',
  },
  user: {
    dashboard: 'view',
    data_management: 'view',
    hr_portal: 'view',
    recruitment: 'view',
    voya_trail: 'view',
    voya_trail_packages: 'view',
    voya_trail_category: 'view',
    voya_trail_destinations: 'view',
    voya_trail_package_form: 'none',
    manage_users: 'none',
    rbac_system: 'none',
  },
};

/**
 * Resolve effective permissions for a user (from roleId + Role or legacy role).
 * @param {Object} user - User document (plain or mongoose doc)
 * @returns {Promise<Object>} Map of resourceKey -> 'none' | 'view' | 'full'
 */
export async function resolveUserPermissions(user) {
  if (!user) return Object.fromEntries(RESOURCES.map((r) => [r.key, 'none']));

  // Legacy: no roleId, use role string
  if (!user.roleId) {
    const legacy = LEGACY_DEFAULT_PERMISSIONS[user.role];
    if (legacy === null) {
      return Object.fromEntries(RESOURCES.map((r) => [r.key, 'full']));
    }
    const map = { ...Object.fromEntries(RESOURCES.map((r) => [r.key, 'none'])), ...legacy };
    return map;
  }

  const role = await Role.findById(user.roleId).lean();
  if (!role) {
    return Object.fromEntries(RESOURCES.map((r) => [r.key, 'none']));
  }
  if (role.isSystem) {
    return Object.fromEntries(RESOURCES.map((r) => [r.key, 'full']));
  }

  const map = Object.fromEntries(RESOURCES.map((r) => [r.key, 'none']));
  for (const p of role.permissions || []) {
    if (RESOURCES.some((r) => r.key === p.resourceKey)) {
      map[p.resourceKey] = p.accessLevel;
    }
  }
  return map;
}

/**
 * Get access level for a single resource from a permissions map.
 */
export function getAccessLevel(permissions, resourceKey) {
  return permissions[resourceKey] || 'none';
}

/**
 * Check if permissions satisfy minimum level (view or full).
 * none < view < full
 */
export function hasMinLevel(accessLevel, minLevel) {
  const order = { none: 0, view: 1, edit: 2, full: 3 };
  return order[accessLevel] >= order[minLevel];
}

/**
 * Middleware: require permission for resourceKey at minLevel ('view' or 'full').
 * Expects req.user to be set (authenticateToken) and req.user.permissions to be set (see auth.js).
 */
export function requirePermission(resourceKey, minLevel = 'view') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const permissions = req.user.permissions || {};
    const access = getAccessLevel(permissions, resourceKey);
    if (!hasMinLevel(access, minLevel)) {
      return res.status(403).json({
        error: `Access denied. Required: ${resourceKey} with ${minLevel} access.`,
      });
    }
    next();
  };
}
