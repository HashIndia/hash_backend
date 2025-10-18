import dotenv from 'dotenv';
dotenv.config();


import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Import services
import './services/emailService.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';

// Import admin routes
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/admin/auth.js';
import adminProductRoutes from './routes/admin/products.js';
import adminOrderRoutes from './routes/admin/orders.js';
import adminCustomerRoutes from './routes/admin/customers.js';
import adminAnalyticsRoutes from './routes/admin/analytics.js';
import adminCampaignRoutes from './routes/admin/campaigns.js';
import debugRoutes from './routes/debugRoutes.js';

import AppError from './utils/appError.js';
import globalErrorHandler from './controllers/errorController.js';
import { getAllowedOrigins } from './utils/domainUtils.js';

const app = express();

// Database Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

connectDB();

// CORS Configuration - Enhanced for Safari/iOS compatibility
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? getAllowedOrigins()
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cookie', 
    'Cache-Control', 
    'Pragma', 
    'Expires',
    'X-Auth-Token', // For Safari/iOS fallback
    'X-Refresh-Token'
  ],
  exposedHeaders: [
    'Set-Cookie',
    'X-Auth-Token', // Expose custom headers for Safari/iOS
    'X-Refresh-Token'
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  preflightContinue: false, // Pass control to the next handler
};

app.use(cors(corsOptions));

// Log CORS configuration in production
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 CORS allowed origins:', getAllowedOrigins());
}

// Handle preflight requests
app.options('*', cors());

// Parse cookies BEFORE other middleware
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  
  // Debug middleware only in development
  app.use((req, res, next) => {
    if (req.path.includes('/api/')) {
      console.log(`[${req.method}] ${req.path}`);
      console.log('[DEBUG] Request cookies:', req.cookies);
      console.log('[DEBUG] Request headers:', req.headers.cookie);
    }
    next();
  });

  // Debug middleware to log responses
  app.use((req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
      if (req.path.includes('/auth/')) {
        console.log('[Response] Headers being sent:', this.getHeaders());
      }
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      if (req.path.includes('/auth/')) {
        console.log('[Response] Headers being sent:', this.getHeaders());
      }
      return originalJson.call(this, data);
    };
    
    next();
  });
}// Routes
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reviews', reviewRoutes);

// Admin Routes - Mount specific routes first, then general ones
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/campaigns', adminCampaignRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Hash Store API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

// Function to find available port
const findAvailablePort = (port) => {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      server.close(() => resolve(port));
    }).on('error', () => {
      resolve(findAvailablePort(parseInt(port) + 1));
    });
  });
};

// Start server with port fallback
const startServer = async () => {
  try {
    const PORT = parseInt(process.env.PORT) || 5000;
    const availablePort = await findAvailablePort(PORT);
    
    app.listen(availablePort, () => {
      console.log(`🚀 Server running on port ${availablePort}`);
      console.log(`🌐 CORS enabled for all origins`);
      
      if (availablePort !== PORT) {
        console.log(`⚠️  Port ${PORT} was in use, using port ${availablePort} instead`);
        console.log(`📌 Update your frontend to use: http://localhost:${availablePort}/api`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
