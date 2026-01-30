import Destination from '../models/Destination.js';
import TourPackage from '../models/TourPackage.js';

// List all destinations
export const listDestinations = async (req, res) => {
    try {
        const destinations = await Destination.find().sort({ createdAt: -1 });

        // Get package counts for each destination
        // Note: This is a simple implementation. For large datasets, use aggregation.
        const destinationsWithCounts = await Promise.all(destinations.map(async (dest) => {
            const count = await TourPackage.countDocuments({
                $or: [
                    { 'locations': dest.name }, // Match by name in locations array
                    // Add other matching logic if needed (e.g. if we add destinationId to packages later)
                ]
            });
            const destObj = dest.toObject();
            destObj.packageCount = count;
            return destObj;
        }));

        res.json({
            success: true,
            data: destinationsWithCounts
        });
    } catch (error) {
        console.error('Error listing destinations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch destinations',
            error: error.message
        });
    }
};

// Get a single destination
export const getDestination = async (req, res) => {
    try {
        const destination = await Destination.findById(req.params.id);
        if (!destination) {
            return res.status(404).json({
                success: false,
                message: 'Destination not found'
            });
        }
        res.json({
            success: true,
            data: destination
        });
    } catch (error) {
        console.error('Error fetching destination:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch destination',
            error: error.message
        });
    }
};

// Create a new destination
export const createDestination = async (req, res) => {
    try {
        const { name, slug, description, isActive } = req.body;

        // Check if slug already exists
        const existing = await Destination.findOne({ slug });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A destination with this slug already exists'
            });
        }

        const destination = new Destination({
            name,
            slug,
            description,
            isActive
        });

        await destination.save();

        res.status(201).json({
            success: true,
            message: 'Destination created successfully',
            data: destination
        });
    } catch (error) {
        console.error('Error creating destination:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create destination',
            error: error.message
        });
    }
};

// Update a destination
export const updateDestination = async (req, res) => {
    try {
        const { name, slug, description, isActive } = req.body;

        // Check if slug exists for other destinations
        if (slug) {
            const existing = await Destination.findOne({ slug, _id: { $ne: req.params.id } });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A destination with this slug already exists'
                });
            }
        }

        const destination = await Destination.findByIdAndUpdate(
            req.params.id,
            { name, slug, description, isActive },
            { new: true, runValidators: true }
        );

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: 'Destination not found'
            });
        }

        res.json({
            success: true,
            message: 'Destination updated successfully',
            data: destination
        });
    } catch (error) {
        console.error('Error updating destination:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update destination',
            error: error.message
        });
    }
};

// Delete a destination
export const deleteDestination = async (req, res) => {
    try {
        const destination = await Destination.findByIdAndDelete(req.params.id);

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: 'Destination not found'
            });
        }

        res.json({
            success: true,
            message: 'Destination deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting destination:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete destination',
            error: error.message
        });
    }
};
