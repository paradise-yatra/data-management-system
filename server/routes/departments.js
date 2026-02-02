import express from 'express';
import Department from '../models/Department.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find()
            .populate('head', 'name email')
            .sort({ name: 1 });

        // Get member counts for each department
        const departmentsWithCounts = await Promise.all(
            departments.map(async (dept) => {
                const memberCount = await User.countDocuments({ departmentId: dept._id });
                return {
                    ...dept.toJSON(),
                    memberCount,
                };
            })
        );

        res.json(departmentsWithCounts);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET a single department with its members
router.get('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id)
            .populate('head', 'name email');

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const members = await User.find({ departmentId: department._id })
            .select('name email role isActive')
            .sort({ name: 1 });

        res.json({
            ...department.toJSON(),
            members,
        });
    } catch (error) {
        console.error('Error fetching department:', error);
        res.status(500).json({ error: error.message });
    }
});

// CREATE a new department
router.post('/', async (req, res) => {
    try {
        const { name, description, head, isActive } = req.body;

        // Check if department with same name exists
        const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return res.status(400).json({ error: 'A department with this name already exists' });
        }

        const department = new Department({
            name,
            description,
            head: head || null,
            isActive: isActive !== undefined ? isActive : true,
        });

        await department.save();

        const populated = await Department.findById(department._id)
            .populate('head', 'name email');

        res.status(201).json(populated);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: error.message });
    }
});

// UPDATE a department
router.put('/:id', async (req, res) => {
    try {
        const { name, description, head, isActive } = req.body;

        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check for duplicate name (excluding current)
        if (name && name !== department.name) {
            const existing = await Department.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: department._id }
            });
            if (existing) {
                return res.status(400).json({ error: 'A department with this name already exists' });
            }
        }

        if (name) department.name = name;
        if (description !== undefined) department.description = description;
        if (head !== undefined) department.head = head || null;
        if (isActive !== undefined) department.isActive = isActive;

        await department.save();

        const populated = await Department.findById(department._id)
            .populate('head', 'name email');

        res.json(populated);
    } catch (error) {
        console.error('Error updating department:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE a department
router.delete('/:id', async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        // Check if any users are in this department
        const memberCount = await User.countDocuments({ departmentId: department._id });
        if (memberCount > 0) {
            return res.status(400).json({
                error: `Cannot delete department with ${memberCount} member(s). Please reassign them first.`
            });
        }

        await Department.findByIdAndDelete(req.params.id);
        res.json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET members of a department
router.get('/:id/members', async (req, res) => {
    try {
        const members = await User.find({ departmentId: req.params.id })
            .select('name email role isActive roleId')
            .populate('roleId', 'name')
            .sort({ name: 1 });

        res.json(members);
    } catch (error) {
        console.error('Error fetching department members:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add user to department
router.post('/:id/members', async (req, res) => {
    try {
        const { userId } = req.body;

        const department = await Department.findById(req.params.id);
        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.departmentId = department._id;
        await user.save();

        res.json({ message: 'User added to department successfully' });
    } catch (error) {
        console.error('Error adding user to department:', error);
        res.status(500).json({ error: error.message });
    }
});

// Remove user from department
router.delete('/:id/members/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.departmentId?.toString() !== req.params.id) {
            return res.status(400).json({ error: 'User is not in this department' });
        }

        user.departmentId = null;
        await user.save();

        res.json({ message: 'User removed from department successfully' });
    } catch (error) {
        console.error('Error removing user from department:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
