import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import transactionRoutes from './src/routes/transactionRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for dev flexibility
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize SQLite database
initDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Spendzy Backend Server Running', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Spendzy Backend Server running on http://localhost:${PORT}`);
});
