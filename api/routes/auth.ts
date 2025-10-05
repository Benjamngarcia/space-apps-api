import { Router } from 'express';

// Import from absolute paths that work in Vercel
const { AuthController } = require('../../src/controllers/AuthController');
const { authMiddleware } = require('../../src/middleware/auth');
const { validate, registerSchema, loginSchema, refreshTokenSchema, createRequestSchema } = require('../../src/middleware/validation');

const router = Router();
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

export default router;
