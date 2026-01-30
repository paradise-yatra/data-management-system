import TourCategory from '../models/TourCategory.js';
import TourPackage from '../models/TourPackage.js';

/**
 * GET /api/tour-categories
 */
export const listCategories = async (req, res) => {
    console.log('GET /api/tour-categories - Listing categories');
    try {
        const categories = await TourCategory.find({}).sort({ createdAt: -1 });

        // Get package counts for each category
        const categoriesWithCounts = await Promise.all(categories.map(async (category) => {
            const count = await TourPackage.countDocuments({ category: category._id });
            return {
                ...category.toObject(),
                packageCount: count
            };
        }));

        res.json({ success: true, data: categoriesWithCounts });
    } catch (error) {
        console.error('Error listing categories:', error);
        res.status(500).json({ message: 'Failed to list categories' });
    }
};

/**
 * GET /api/tour-categories/public/slug/:slug
 */
export const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const category = await TourCategory.findOne({ slug });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error fetching category by slug:', error);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
};

/**
 * POST /api/tour-categories
 */
export const createCategory = async (req, res) => {
    console.log('POST /api/tour-categories - Creating category:', req.body);
    try {
        const { name, slug, description, isActive } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ message: 'Name and slug are required' });
        }

        const existing = await TourCategory.findOne({ slug });
        if (existing) {
            return res.status(409).json({ message: 'Category with this slug already exists' });
        }

        const category = await TourCategory.create({
            name,
            slug,
            description,
            isActive: isActive !== undefined ? isActive : true
        });

        res.status(201).json({ success: true, data: category });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Failed to create category' });
    }
};

/**
 * GET /api/tour-categories/:id
 */
export const getCategory = async (req, res) => {
    try {
        const category = await TourCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ message: 'Failed to fetch category' });
    }
};

/**
 * PUT /api/tour-categories/:id
 */
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, isActive } = req.body;

        if (slug) {
            const existing = await TourCategory.findOne({
                _id: { $ne: id },
                slug,
            });
            if (existing) {
                return res.status(409).json({ message: 'Another category with this slug already exists' });
            }
        }

        const category = await TourCategory.findByIdAndUpdate(
            id,
            { name, slug, description, isActive },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json({ success: true, data: category });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Failed to update category' });
    }
};

/**
 * DELETE /api/tour-categories/:id
 */
export const deleteCategory = async (req, res) => {
    console.log('DELETE /api/tour-categories/:id - Deleting category:', req.params.id);
    try {
        const { id } = req.params;

        // Check if category is used in any package
        const usageCount = await TourPackage.countDocuments({ category: id });
        if (usageCount > 0) {
            return res.status(400).json({
                message: `Cannot delete category. It is used in ${usageCount} package(s).`
            });
        }

        const category = await TourCategory.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Failed to delete category' });
    }
};
