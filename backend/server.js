require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const categoryRoutes = require('./routes/categoryRoutes');
const menuRoutes = require('./routes/menuRoutes');
const offerRoutes = require('./routes/offerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const kitchenRoutes = require('./routes/kitchenRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/ai', aiRoutes);

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
});

module.exports = { app, server };
