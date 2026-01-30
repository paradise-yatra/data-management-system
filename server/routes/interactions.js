import express from 'express';
import InteractionLog from '../models/InteractionLog.js';
import Candidate from '../models/Candidate.js';
import Interview from '../models/Interview.js';

const router = express.Router();

// Get productivity stats
router.get('/stats', async (req, res) => {
    try {
        const hrId = req.user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [callsToday, interviewsScheduledToday, candidatesAddedToday] = await Promise.all([
            InteractionLog.countDocuments({
                hrId,
                loggedAt: { $gte: today },
                type: 'Call'
            }),
            Interview.countDocuments({
                createdAt: { $gte: today }
            }),
            Candidate.countDocuments({
                createdAt: { $gte: today }
            })
        ]);

        res.json({
            callsToday,
            interviewsScheduledToday,
            candidatesAddedToday
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Log an interaction
router.post('/', async (req, res) => {
    try {
        const { candidateId, type, response, conclusion, notes, createNewCandidate, candidateData, interviewData } = req.body;
        const hrId = req.user._id;

        let targetCandidateId = candidateId;

        // If logging for a new candidate, create them first
        if (createNewCandidate && candidateData) {
            const newCandidate = new Candidate({
                ...candidateData,
                status: conclusion === 'Shortlisted' ? 'Shortlisted' : 'New'
            });
            const savedCandidate = await newCandidate.save();
            targetCandidateId = savedCandidate._id;
        }

        const interaction = new InteractionLog({
            candidateId: targetCandidateId,
            hrId,
            type,
            response,
            conclusion,
            notes
        });

        const newInteraction = await interaction.save();

        // Update candidate status based on conclusion
        if (conclusion === 'Schedule Interview' || conclusion === 'Shortlisted' || conclusion === 'Rejected') {
            await Candidate.findByIdAndUpdate(targetCandidateId, { status: conclusion === 'Schedule Interview' ? 'Interview Scheduled' : conclusion });
        }

        // If interview data provided, schedule it
        if (conclusion === 'Schedule Interview' && interviewData) {
            const interview = new Interview({
                candidateId: targetCandidateId,
                scheduledAt: interviewData.scheduledAt,
                link: interviewData.link,
                status: 'Scheduled'
            });
            await interview.save();
        }

        res.status(201).json(newInteraction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get interactions for a candidate
router.get('/candidate/:candidateId', async (req, res) => {
    try {
        const interactions = await InteractionLog.find({ candidateId: req.params.candidateId }).sort({ loggedAt: -1 });
        res.json(interactions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
