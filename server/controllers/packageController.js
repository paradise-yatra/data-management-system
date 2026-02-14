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
        const { category, location, excludeCategory, page = 1, limit = 5 } = req.query;
        const query = {
            status: 'published',
            isActive: true
        };

        if (category) {
            if (mongoose.Types.ObjectId.isValid(category)) {
                query.category = category;
            } else {
                const cat = await TourCategory.findOne({ slug: category });
                if (cat) {
                    query.category = cat._id;
                } else {
                    return res.json({
                        success: true,
                        data: [],
                        pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                    });
                }
            }
        }

        if (location) {
            query.locations = { $in: [new RegExp(`^${location}$`, 'i')] };
        }

        if (excludeCategory) {
            let excludedId = null;
            if (mongoose.Types.ObjectId.isValid(excludeCategory)) {
                excludedId = excludeCategory;
            } else {
                const cat = await TourCategory.findOne({ slug: excludeCategory });
                if (cat) {
                    excludedId = cat._id;
                }
            }

            if (excludedId) {
                if (!query.category) {
                    query.category = { $ne: excludedId };
                } else if (query.category instanceof mongoose.Types.ObjectId) {
                    // If we already have a category filter, and it matches the excluded one, return empty
                    if (query.category.equals(excludedId)) {
                        return res.json({
                            success: true,
                            data: [],
                            pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 }
                        });
                    }
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

export const searchAll = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) {
            return res.json({
                success: true,
                data: {
                    packages: [],
                    categories: [],
                    destinations: []
                }
            });
        }

        // Escape special regex chars to avoid errors
        const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeQ, 'i');

        const [packages, categories] = await Promise.all([
            TourPackage.find({
                status: 'published',
                isActive: true, // Assuming isActive check is also needed
                $or: [
                    { title: regex },
                    { locations: regex }
                ]
            })
                .select('title slug locations mainImage category duration startingPrice basePrice durationNights durationDays')
                .populate('category', 'name slug')
                .limit(5)
                .lean(),

            TourCategory.find({
                isActive: true,
                name: regex
            })
                .select('name slug')
                .limit(3)
                .lean()
        ]);

        // Find distinctive locations with their categories
        const locationPackages = await TourPackage.find({
            status: 'published',
            isActive: true,
            locations: { $in: [regex] }
        })
            .select('locations category')
            .populate('category', 'slug')
            .limit(50)
            .lean();

        const destMap = new Map();
        locationPackages.forEach(pkg => {
            if (pkg.locations && Array.isArray(pkg.locations)) {
                pkg.locations.forEach(loc => {
                    if (regex.test(loc)) {
                        if (!destMap.has(loc)) {
                            destMap.set(loc, pkg.category?.slug || 'india-tours');
                        }
                    }
                });
            }
        });

        const destinations = Array.from(destMap.entries())
            .slice(0, 5)
            .map(([name, catSlug]) => ({
                name,
                slug: name.toLowerCase().replace(/\s+/g, '-'),
                categorySlug: catSlug
            }));

        // Map packages to match frontend expectations
        const mappedPackages = packages.map(pkg => ({
            ...pkg,
            categorySlug: pkg.category?.slug || 'tours',
            location: pkg.locations?.[0] || 'India'
        }));

        res.json({
            success: true,
            data: {
                packages: mappedPackages,
                destinations
            }
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
};

export const getQualityCheck = async (req, res) => {
    try {
        const packages = await TourPackage.find({ status: { $ne: 'archived' } })
            .populate('category', 'name')
            .lean();

        const qualityData = packages.map(pkg => {
            const missingFields = [];

            // 1. Check Images
            if (!pkg.mainImage && (!pkg.images || !pkg.images.hero || !pkg.images.hero.url)) {
                missingFields.push('Main Image / Hero Image');
            }
            if ((!pkg.galleryImages || pkg.galleryImages.length === 0) && (!pkg.images || !pkg.images.gallery || pkg.images.gallery.length === 0)) {
                missingFields.push('Gallery Images');
            }

            // 2. Check Basic Info
            if (!pkg.overview || !pkg.overview.description) missingFields.push('Overview Description');
            if (!pkg.locations || pkg.locations.length === 0) missingFields.push('Locations');
            if (!pkg.startingPrice) missingFields.push('Starting Price');

            // 3. Check Itinerary
            if (!pkg.itinerary || pkg.itinerary.length === 0) {
                missingFields.push('Itinerary (Empty)');
            } else {
                // Check if itinerary days match duration
                const durationDays = pkg.duration?.days || 0;
                if (pkg.itinerary.length !== durationDays) {
                    missingFields.push(`Itinerary Length Mismatch (Expected ${durationDays}, Found ${pkg.itinerary.length})`);
                }

                // Check explicitly for missing content in itinerary items
                const emptyItineraryItems = pkg.itinerary.some(item => !item.description || item.description.length < 50);
                if (emptyItineraryItems) missingFields.push('Itinerary Content (Some days have empty/short descriptions)');
            }

            // 4. Check SEO
            if (!pkg.seo || !pkg.seo.metaTitle) missingFields.push('SEO Meta Title');
            if (!pkg.seo || !pkg.seo.metaDescription) missingFields.push('SEO Meta Description');

            // 5. Check Inclusions/Exclusions
            if (!pkg.inclusions || pkg.inclusions.length === 0) missingFields.push('Inclusions');
            if (!pkg.exclusions || pkg.exclusions.length === 0) missingFields.push('Exclusions');

            // Calculate score (simple percentage based on arbitrary weights or count)
            const totalChecks = 10; // Total number of logical checks above
            const passedChecks = totalChecks - missingFields.length; // Approximate
            // A better score would be weighted, but let's just do a simple inversion of missing count
            // Let's just return the missing fields count for sorting

            return {
                id: pkg._id,
                title: pkg.title,
                slug: pkg.slug,
                status: pkg.status,
                category: pkg.category?.name || 'Uncategorized',
                updatedAt: pkg.updatedAt,
                missingFields,
                issueCount: missingFields.length
            };
        });

        // Sort by issue count (descending) so worst packages are first
        qualityData.sort((a, b) => b.issueCount - a.issueCount);

        res.json({
            success: true,
            data: qualityData
        });

    } catch (error) {
        console.error('Error in quality check:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
