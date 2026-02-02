import express from "express";
import {
    getBlogs,
    getBlogById,
    createBlog,
    updateBlog,
    deleteBlog,
} from "../controllers/blogController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
    .get(getBlogs)
    .post(authenticateToken, authorizeRoles('admin'), createBlog);

router.route("/:id")
    .get(getBlogById)
    .put(authenticateToken, authorizeRoles('admin'), updateBlog)
    .delete(authenticateToken, authorizeRoles('admin'), deleteBlog);

export default router;
