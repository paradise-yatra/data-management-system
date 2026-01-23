import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import sourcesRoutes from './routes/sources.js';
import identitiesRoutes from './routes/identities.js';
import trashRoutes from './routes/trash.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import logsRoutes from './routes/logs.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/identities', identitiesRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/logs', logsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

