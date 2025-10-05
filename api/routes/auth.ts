import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// Simple test route that doesn't depend on external modules
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth route is working!',
    timestamp: new Date().toISOString()
  });
});

// Health check for auth routes
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Auth routes are operational',
    available_endpoints: [
      'GET /api/auth/test',
      'GET /api/auth/health'
    ]
  });
});

// Try to load the actual auth controller with error handling
try {
  const { AuthController } = require('../../src/controllers/AuthController');
  const { authMiddleware } = require('../../src/middleware/auth');
  const { validate, registerSchema, loginSchema, refreshTokenSchema, createRequestSchema } = require('../../src/middleware/validation');

  const authController = new AuthController();

  // Public routes
  router.post('/register', validate(registerSchema), authController.register);
  router.post('/login', validate(loginSchema), authController.login);
  router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

  // Tag routes (public - for registration form)
  router.get('/tags', authController.getAllTags);
  router.get('/tags/by-type', authController.getTagsByType);
  router.get('/tags/:id', authController.getTagById);
  router.post('/tags/by-list', authController.getTagsByList);

  // Protected routes
  router.post('/logout', authMiddleware, authController.logout);
  router.get('/profile', authMiddleware, authController.getProfile);
  router.post('/requests', authMiddleware, validate(createRequestSchema), authController.createRequest);

} catch (error) {
  console.error('Failed to load AuthController:', error);
  
  // Fallback routes that show what's wrong
  router.post('/register', (req: Request, res: Response) => {
    res.status(500).json({
      error: 'AuthController not available',
      details: error.message,
      message: 'The registration endpoint is currently unavailable due to module loading issues.'
    });
  });

  router.post('/login', (req: Request, res: Response) => {
    res.status(500).json({
      error: 'AuthController not available', 
      details: error.message,
      message: 'The login endpoint is currently unavailable due to module loading issues.'
    });
  });

  router.get('/tags', (req: Request, res: Response) => {
    res.status(500).json({
      error: 'AuthController not available',
      details: error.message,
      message: 'The tags endpoint is currently unavailable due to module loading issues.'
    });
  });
}

export default router;
