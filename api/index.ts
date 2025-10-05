import { VercelRequest, VercelResponse } from '@vercel/node';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';

// Import routes from local API directory with error handling
let authRoutes: any;
let s3Routes: any;
let dataRoutes: any;

try {
  authRoutes = require('./routes/auth').default || require('./routes/auth');
  s3Routes = require('./routes/s3').default || require('./routes/s3');
  dataRoutes = require('./routes/files').default || require('./routes/files');
} catch (error) {
  console.error('Failed to load routes:', error);
  
  // Create fallback routes that show the error
  const { Router } = express;
  
  authRoutes = Router();
  s3Routes = Router();
  dataRoutes = Router();
  
  const errorInfo = {
    error: 'Routes not available',
    details: error.message,
    stack: error.stack,
    cwd: process.cwd(),
    files_check: {
      auth_exists: fs.existsSync('./routes/auth.ts') || fs.existsSync('./routes/auth.js'),
      src_exists: fs.existsSync('../../src/controllers/AuthController.ts') || fs.existsSync('../../src/controllers/AuthController.js')
    }
  };
  
  authRoutes.all('*', (req: any, res: any) => {
    res.status(500).json({ 
      route: 'auth',
      ...errorInfo
    });
  });
  
  s3Routes.all('*', (req: any, res: any) => {
    res.status(500).json({ 
      route: 's3',
      ...errorInfo
    });
  });
  
  dataRoutes.all('*', (req: any, res: any) => {
    res.status(500).json({ 
      route: 'files',
      ...errorInfo
    });
  });
}

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/s3', s3Routes);
app.use('/api/files', dataRoutes);

// Home page for testing
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Space Apps API is running on Vercel!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    routes: [
      '/api/auth/*',
      '/api/s3/*', 
      '/api/files/*'
    ],
    debug: {
      vercel: !!process.env.VERCEL,
      cwd: process.cwd(),
      task_root: process.env.LAMBDA_TASK_ROOT || 'Not available'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
  });
});

// Export the Express app as a Vercel serverless function
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
