import NewsletterSubmission from '../models/NewsletterSubmission.js';

// Public route to submit email
export const subscribe = async (req, res) => {
    try {
        const { email, source } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const existingSubscription = await NewsletterSubmission.findOne({ email });
        if (existingSubscription) {
            // Re-activate if unsubscribed, or just return success
            if (existingSubscription.status === 'unsubscribed') {
                existingSubscription.status = 'active';
                await existingSubscription.save();
                return res.status(200).json({ success: true, message: 'Welcome back! You have been resubscribed.' });
            }
            return res.status(200).json({ success: true, message: 'You are already subscribed!' });
        }

        const newSubscription = new NewsletterSubmission({
            email,
            source: source || 'unknown',
        });

        await newSubscription.save();
        res.status(201).json({ success: true, message: 'Successfully subscribed to the newsletter!' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
};

// Admin routes
export const getAllSubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const query = {};
        if (status && status !== 'all') query.status = status;

        const submissions = await NewsletterSubmission.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await NewsletterSubmission.countDocuments(query);

        res.status(200).json({
            data: submissions,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            total: count
        });
    } catch (error) {
        console.error('Error fetching newsletter submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
};

export const deleteSubmission = async (req, res) => {
    try {
        await NewsletterSubmission.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Submission deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete submission' });
    }
};

export const getStats = async (req, res) => {
    try {
        const total = await NewsletterSubmission.countDocuments();
        const active = await NewsletterSubmission.countDocuments({ status: 'active' });
        const unsubscribed = await NewsletterSubmission.countDocuments({ status: 'unsubscribed' });

        res.status(200).json({
            total,
            active,
            unsubscribed
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
