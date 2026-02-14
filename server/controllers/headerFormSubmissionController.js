import HeaderFormSubmission from '../models/HeaderFormSubmission.js';

// Get all submissions (authenticated, for CRM panel)
export const getSubmissions = async (req, res) => {
    try {
        const { status, page = 1, limit = 50, sort = '-createdAt' } = req.query;

        const filter = {};
        if (status && status !== 'all') {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [submissions, total] = await Promise.all([
            HeaderFormSubmission.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            HeaderFormSubmission.countDocuments(filter),
        ]);

        res.json({
            data: submissions,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
        });
    } catch (error) {
        console.error('Error fetching header form submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

// Get a single submission by ID (authenticated)
export const getSubmissionById = async (req, res) => {
    try {
        const submission = await HeaderFormSubmission.findById(req.params.id).lean();
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json({ data: submission });
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
};

// Create a new submission (public — called from the website)
export const createSubmission = async (req, res) => {
    try {
        const { name, email, phone, destination, budget, travelDate, message, newsletter } = req.body;

        // Validation
        if (!name || !email || !destination || !budget || !travelDate) {
            return res.status(400).json({ error: 'Name, email, destination, budget, and travel date are required' });
        }

        const submission = new HeaderFormSubmission({
            name,
            email,
            phone: phone || '',
            destination,
            budget,
            travelDate: new Date(travelDate),
            message: message || '',
            newsletter: newsletter || false,
            status: 'new',
            source: 'website-header-form',
        });

        await submission.save();

        res.status(201).json({
            success: true,
            message: 'Booking inquiry submitted successfully',
            data: submission,
        });
    } catch (error) {
        console.error('Error creating header form submission:', error);
        res.status(500).json({ error: 'Failed to submit booking inquiry' });
    }
};

// Update submission status/notes (authenticated, for CRM panel)
export const updateSubmission = async (req, res) => {
    try {
        const { status, notes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        const submission = await HeaderFormSubmission.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        res.json({
            success: true,
            message: 'Submission updated successfully',
            data: submission,
        });
    } catch (error) {
        console.error('Error updating submission:', error);
        res.status(500).json({ error: 'Failed to update submission' });
    }
};

// Delete a submission (authenticated)
export const deleteSubmission = async (req, res) => {
    try {
        const submission = await HeaderFormSubmission.findByIdAndDelete(req.params.id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json({ success: true, message: 'Submission deleted successfully' });
    } catch (error) {
        console.error('Error deleting submission:', error);
        res.status(500).json({ error: 'Failed to delete submission' });
    }
};

// Get submission stats (authenticated)
export const getSubmissionStats = async (req, res) => {
    try {
        const [total, newCount, contactedCount, convertedCount, closedCount] = await Promise.all([
            HeaderFormSubmission.countDocuments(),
            HeaderFormSubmission.countDocuments({ status: 'new' }),
            HeaderFormSubmission.countDocuments({ status: 'contacted' }),
            HeaderFormSubmission.countDocuments({ status: 'converted' }),
            HeaderFormSubmission.countDocuments({ status: 'closed' }),
        ]);

        res.json({
            total,
            new: newCount,
            contacted: contactedCount,
            converted: convertedCount,
            closed: closedCount,
        });
    } catch (error) {
        console.error('Error fetching submission stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
