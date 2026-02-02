import Blog from "../models/Blog.js";

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public (or Private based on needs, kept public for list)
export const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Public
export const getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (blog) {
            res.json(blog);
        } else {
            res.status(404).json({ message: "Blog not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a blog
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
    try {
        const blog = new Blog(req.body);
        const createdBlog = await blog.save();
        res.status(201).json(createdBlog);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Update a blog
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (blog) {
            Object.assign(blog, req.body);
            const updatedBlog = await blog.save();
            res.json(updatedBlog);
        } else {
            res.status(404).json({ message: "Blog not found" });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Delete a blog
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (blog) {
            await blog.deleteOne();
            res.json({ message: "Blog removed" });
        } else {
            res.status(404).json({ message: "Blog not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
