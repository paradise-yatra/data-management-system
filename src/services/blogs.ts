import axios from "axios";

// Access Vite environment variables correctly
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface Blog {
    _id: string;
    title: string;
    slug: string;
    date: string;
    image: string;
    author: string;
    readTime: string;
    category: string;
    tags: string[];
    content: string; // JSON string
    contentHtml?: string;
    isFeatured: boolean;
    excerpt?: string;
    status: "draft" | "published";
    createdAt: string;
    updatedAt: string;
}

export type CreateBlogData = Omit<Blog, "_id" | "createdAt" | "updatedAt">;
export type UpdateBlogData = Partial<CreateBlogData>;

// Create axios instance with auth header (handled by cookie or interceptor usually, but basic setup here)
// Assuming auth token is handled via HttpOnly cookie as per server setup (cookieParser)
// If manual bearer token is needed, we'd need to intercept.
// Based on server/index.js (cookieParser), credentials: true is needed.

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

export const blogService = {
    getAll: async () => {
        const response = await api.get<Blog[]>("/blogs");
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Blog>(`/blogs/${id}`);
        return response.data;
    },

    create: async (data: CreateBlogData) => {
        const response = await api.post<Blog>("/blogs", data);
        return response.data;
    },

    update: async (id: string, data: UpdateBlogData) => {
        const response = await api.put<Blog>(`/blogs/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/blogs/${id}`);
        return response.data;
    },
};
