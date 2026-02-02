import express from 'express';
import TelecallerLog from '../models/TelecallerLog.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Get filtered logs
router.get('/', async (req, res) => {
    try {
        const { startDate, endDate, userId, action, page = 1, limit = 50 } = req.query;

        const query = {};

        // Date Filter
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.timestamp.$lte = end;
            }
        }

        // User Filter
        if (userId && userId !== 'all') {
            query['performedBy.userId'] = userId;
        }

        // Action Filter
        if (action && action !== 'all') {
            query.action = action;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await TelecallerLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await TelecallerLog.countDocuments(query);

        res.json({
            data: logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
