import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requirePermission, getAccessLevel, hasMinLevel } from '../middleware/rbac.js';
import * as rbacController from '../controllers/rbacController.js';

const router = express.Router();

router.use(authenticateToken);

// Any authenticated user can read resources and their own permissions (for sidebar/route guards)
router.get('/resources', rbacController.getResources);
router.get('/me/permissions', rbacController.getMyPermissions);

// List roles: need rbac_system full OR manage_users view (for Users page role dropdown)
function allowRolesList(req, res, next) {
  const perms = req.user?.permissions || {};
  const rbac = getAccessLevel(perms, 'rbac_system');
  const users = getAccessLevel(perms, 'manage_users');
  if (hasMinLevel(rbac, 'full') || hasMinLevel(users, 'view')) return next();
  return res.status(403).json({ error: 'Access denied.' });
}

router.get('/roles', allowRolesList, rbacController.getRoles);
router.get('/roles/:id', requirePermission('rbac_system', 'full'), rbacController.getRoleById);
router.post('/roles', requirePermission('rbac_system', 'full'), rbacController.createRole);
router.put('/roles/:id', requirePermission('rbac_system', 'full'), rbacController.updateRole);
router.delete('/roles/:id', requirePermission('rbac_system', 'full'), rbacController.deleteRole);

export default router;
