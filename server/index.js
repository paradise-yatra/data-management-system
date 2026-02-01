import './env.js';
import express from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import sourcesRoutes from './routes/sources.js';
import identitiesRoutes from './routes/identities.js';
import trashRoutes from './routes/trash.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import logsRoutes from './routes/logs.js';
import candidatesRoutes from './routes/candidates.js';
import interactionsRoutes from './routes/interactions.js';
import interviewsRoutes from './routes/interviews.js';
import tourCategoriesRoutes from './routes/tourCategories.js';
import packageRoutes from './routes/packageRoutes.js';
import destinationRoutes from './routes/destinations.js';
import rbacRoutes from './routes/rbac.js';
import costItemsRoutes from './routes/costItems.js';
import citiesRoutes from './routes/cities.js';
import itinerariesRoutes from './routes/itineraries.js';
import settingsRoutes from './routes/settings.js';
import { authenticateToken } from './middleware/auth.js';

const app = express();

const PORT = process.env.PORT || 3001;

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Middleware
// Trust proxy for accurate IP address extraction (when behind reverse proxy/load balancer)
app.set('trust proxy', true);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:8080',
  'http://localhost:3000', // Equinox Frontend
  'http://localhost:3002'  // Self (just in case)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // For development, you might want to allow all, but let's be specific
      // return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      // Actually, for dev ease, let's just allow it if it matches localhost
      if (origin.startsWith('http://localhost')) {
        return callback(null, true);
      }
      return callback(null, false);
    }
    return callback(null, true);
  },
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
app.use('/api/candidates', authenticateToken, candidatesRoutes);
app.use('/api/interactions', authenticateToken, interactionsRoutes);
app.use('/api/interviews', authenticateToken, interviewsRoutes);
app.use('/api/tour-categories', tourCategoriesRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/rbac', rbacRoutes);
app.use('/api/cost-items', costItemsRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/itineraries', itinerariesRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(rootDir, 'dist');
  app.use(express.static(distPath));

  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Serving static files from: ${path.join(rootDir, 'dist')}`);
  }
});
