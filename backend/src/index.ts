import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import paymentRoutes from './routes/payments';
import downloadRoutes from './routes/downloads';
import ticketRoutes from './routes/tickets';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/error';
import { apiLimiter } from './middleware/rateLimit';
import prisma from './prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to all APIs
app.use('/api', apiLimiter);

// Standard health check
app.get('/api/health', async (req, res) => {
  try {
    // Basic DB check
    await prisma.$executeRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      database: 'DISCONNECTED',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Register routers
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/downloads', downloadRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`[Server] Digital Vault API service is running on port ${PORT}`);
});

export default app;
