require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

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

// Phase 1 Root Status Route
app.get('/', (req, res) => {
  res.send('RESTOSMART Restaurant Automation API Server is running. Access API endpoints under /api/*');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 RESTOSMART Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
});
