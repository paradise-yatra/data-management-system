import express from 'express';
import Candidate from '../models/Candidate.js';

const router = express.Router();

// Get all candidates
router.get('/', async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        if (status) {
            query.status = status;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contactNumber: { $regex: search, $options: 'i' } }
            ];
        }

        const candidates = await Candidate.find(query).sort({ updatedAt: -1 });
        res.json(candidates);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new candidate
router.post('/', async (req, res) => {
    const candidate = new Candidate({
        name: req.body.name,
        contactNumber: req.body.contactNumber,
        email: req.body.email,
        source: req.body.source,
        currentPosition: req.body.currentPosition,
        status: req.body.status
    });

    try {
        const newCandidate = await candidate.save();
        res.status(201).json(newCandidate);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get a specific candidate
router.get('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
        res.json(candidate);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update a candidate
router.put('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        Object.assign(candidate, req.body);
        const updatedCandidate = await candidate.save();
        res.json(updatedCandidate);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a candidate
router.delete('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);
        if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

        await candidate.deleteOne();
        res.json({ message: 'Candidate deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
