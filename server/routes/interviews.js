import express from 'express';
import Interview from '../models/Interview.js';

const router = express.Router();

// Schedule an interview
router.post('/', async (req, res) => {
    const interview = new Interview({
        candidateId: req.body.candidateId,
        scheduledAt: req.body.scheduledAt,
        link: req.body.link,
        status: 'Scheduled'
    });

    try {
        const newInterview = await interview.save();
        res.status(201).json(newInterview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get all interviews (can filter by date range or status)
router.get('/', async (req, res) => {
    try {
        const { start, end, status } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        }

        if (start && end) {
            query.scheduledAt = { $gte: new Date(start), $lte: new Date(end) };
        }

        const interviews = await Interview.find(query).populate('candidateId', 'name contactNumber').sort({ scheduledAt: 1 });
        res.json(interviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update interview status
router.put('/:id', async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) return res.status(404).json({ message: 'Interview not found' });

        if (req.body.status) interview.status = req.body.status;
        if (req.body.link) interview.link = req.body.link;
        if (req.body.scheduledAt) interview.scheduledAt = req.body.scheduledAt;

        const updatedInterview = await interview.save();
        res.json(updatedInterview);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

export default router;
