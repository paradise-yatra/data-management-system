import mongoose from "mongoose";

import { getVoyaTrailConnection } from '../config/db.js';

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        image: {
            type: String,
            required: true, // Cloudinary URL
        },
        author: {
            type: String,
            default: "Admin", // Static for now
        },
        readTime: {
            type: String,
            default: "5 min read",
        },
        category: {
            type: String,
            default: "General", // Static for now
        },
        tags: {
            type: [String],
            default: [], // Static for now
        },
        content: {
            type: String, // JSON string of Lexical state
            required: true,
        },
        contentHtml: {
            type: String, // HTML representation
            required: false,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
    },
    {
        timestamps: true,
    }
);

const voyaTrailDb = getVoyaTrailConnection();
const Blog = voyaTrailDb.model("Blog", blogSchema);

export default Blog;
