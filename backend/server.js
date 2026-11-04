require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const categoryRoutes = require('./routes/categoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const offerRoutes = require('./routes/offerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Allowed origins for CORS (supports port 5173, 5174, and custom CLIENT_URL)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '25mb' })); // Support base64 audio payloads

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/voice', voiceRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'RESTOSMART API Server',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  });
});

// Root Status Route
app.get('/', (req, res) => {
  res.send('RESTOSMART Restaurant Automation API Server is running. Access API endpoints under /api/*');
});

// 404 Handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 RESTOSMART Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Categories API: http://localhost:${PORT}/api/categories`);
  console.log(`   Menu API: http://localhost:${PORT}/api/menu`);
  console.log(`   Offers API: http://localhost:${PORT}/api/offers`);
  console.log(`   Orders API: http://localhost:${PORT}/api/orders`);
});

// Robust port error handling (EADDRINUSE)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`\n⚠️  Port ${PORT} is already in use by an active RESTOSMART backend process.`);
    console.warn(`   The backend API is already active and serving requests at http://localhost:${PORT}`);
    console.warn(`   If you need to force-restart, stop the existing node process running on port ${PORT}.\n`);
  } else {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
});

// Graceful shutdown on termination signals
const handleShutdown = () => {
  server.close(() => {
    console.log('✅ RESTOSMART Server closed. Port freed.');
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

module.exports = { app, server };
