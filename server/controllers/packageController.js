import TourPackage from '../models/TourPackage.js';
import TourCategory from '../models/TourCategory.js';
import mongoose from 'mongoose';
import cloudinary from '../utils/cloudinary.js';
import { Readable } from 'stream';

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'voya-trail/packages',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        const stream = Readable.from(buffer);
        stream.pipe(uploadStream);
    });
};

export const createPackage = async (req, res) => {
    try {
        const packageData = req.body;

        // Check if slug exists
        const existingPackage = await TourPackage.findOne({ slug: packageData.slug });
        if (existingPackage) {
            return res.status(400).json({ message: 'Package with this slug already exists' });
        }

        const newPackage = new TourPackage(packageData);
        await newPackage.save();

        res.status(201).json({ success: true, data: newPackage });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getAllPackages = async (req, res) => {
    try {
        const { category } = req.query;
        const query = {};
        if (category) {
            query.category = category;
        }

        const packages = await TourPackage.find(query)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: packages });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getPublicPackages = async (req, res) => {
    try {
        const { category, page = 1, limit = 5 } = req.query;
        const query = {
            status: 'published',
            isActive: true
        };

        if (category) {
            // Check if it's an ID or a slug
            if (mongoose.Types.ObjectId.isValid(category)) {
                query.category = category;
            } else {
                // Find by category slug
                const cat = await TourCategory.findOne({ slug: category });
                if (cat) {
                    query.category = cat._id;
                } else {
                    // Category slug doesn't exist, return empty
                    return res.json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                    });
                }
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await TourPackage.countDocuments(query);

        const packages = await TourPackage.find(query)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: packages,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching public packages:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getPackageById = async (req, res) => {
    try {
        const pkg = await TourPackage.findById(req.params.id).populate('category', 'name slug');
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.json({ success: true, data: pkg });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getPackageBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const pkg = await TourPackage.findOne({
            slug,
            status: { $ne: 'draft' },
            isActive: true
        }).populate('category', 'name slug');

        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.json({ success: true, data: pkg });
    } catch (error) {
        console.error('Error fetching package by slug:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const pkg = await TourPackage.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }

        res.json({ success: true, data: pkg });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await TourPackage.findByIdAndDelete(id);
        if (!pkg) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file size (200KB)
        if (req.file.size > 200 * 1024) {
            return res.status(400).json({ message: 'File size exceeds 200KB limit' });
        }

        const result = await uploadToCloudinary(req.file.buffer);
        res.json({ success: true, data: { url: result.secure_url, public_id: result.public_id } });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};
