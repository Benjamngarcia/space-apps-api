import { Router, Request, Response } from "express";

const router = Router();

// Simple test route
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'S3 route is working!',
    timestamp: new Date().toISOString()
  });
});

try {
  const { S3Controller } = require('../controllers/S3Controller');
  const { authMiddleware } = require('../middleware/auth');

  const s3Controller = new S3Controller();

  // Ruta protegida para listar archivos en S3
  router.get("/files", authMiddleware, s3Controller.listFiles);
  router.get("/files/latest", authMiddleware, s3Controller.readFile);
  router.get("/files/latest-by-state", authMiddleware, s3Controller.getLatestDataByState);
  router.get("/data", authMiddleware, s3Controller.getFileData);

} catch (error) {
  console.error('Failed to load S3Controller:', error);
  
  router.get("/files", (req: Request, res: Response) => {
    res.status(500).json({
      error: 'S3Controller not available',
      details: error.message
    });
  });
}

export default router;
