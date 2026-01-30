import Role from '../models/Role.js';
import { RESOURCES, ACCESS_LEVELS } from '../config/resources.js';
import { resolveUserPermissions } from '../middleware/rbac.js';

export async function getResources(req, res) {
  try {
    res.json(RESOURCES);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
}

export async function getRoles(req, res) {
  try {
    const roles = await Role.find().sort({ isSystem: -1, name: 1 }).lean();
    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
}

export async function getRoleById(req, res) {
  try {
    const role = await Role.findById(req.params.id).lean();
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    res.json(role);
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
}

export async function createRole(req, res) {
  try {
    const { name, description, permissions, isSystem } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const existing = await Role.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }

    const normalizedPermissions = normalizePermissions(permissions);
    const role = new Role({
      name: name.trim(),
      description: description ? description.trim() : '',
      permissions: normalizedPermissions,
      isSystem: !!isSystem,
    });
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    console.error('Create role error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to create role' });
  }
}

export async function updateRole(req, res) {
  try {
    const { name, description, permissions, isSystem } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (name !== undefined && name.trim()) {
      const existing = await Role.findOne({ name: name.trim(), _id: { $ne: role._id } });
      if (existing) {
        return res.status(400).json({ error: 'A role with this name already exists' });
      }
      role.name = name.trim();
    }
    if (description !== undefined) role.description = description.trim();
    if (permissions !== undefined) role.permissions = normalizePermissions(permissions);
    if (typeof isSystem === 'boolean' && !role.isSystem) {
      role.isSystem = isSystem;
    }

    await role.save();
    res.json(role);
  } catch (error) {
    console.error('Update role error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Failed to update role' });
  }
}

export async function deleteRole(req, res) {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    if (role.isSystem) {
      return res.status(400).json({ error: 'System roles cannot be deleted' });
    }
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
}

export async function getMyPermissions(req, res) {
  try {
    const permissions = await resolveUserPermissions(req.user);
    res.json({ permissions });
  } catch (error) {
    console.error('Get my permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  const keys = RESOURCES.map((r) => r.key);
  return permissions
    .filter((p) => p && p.resourceKey && ACCESS_LEVELS.includes(p.accessLevel))
    .filter((p) => keys.includes(p.resourceKey))
    .map((p) => ({ resourceKey: p.resourceKey, accessLevel: p.accessLevel }));
}
