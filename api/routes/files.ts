import { Router, Request, Response } from "express";

const router = Router();

// Simple test route
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Files route is working!',
    timestamp: new Date().toISOString()
  });
});

try {
  const { fileController } = require('../../src/controllers/fileController');
  const { authMiddleware } = require('../../src/middleware/auth');

  const fileCon = new fileController();

  router.get("/map-data", authMiddleware, fileCon.processMapData);
  router.get("/zip/:zip", authMiddleware, fileCon.getDataByZip);

} catch (error) {
  console.error('Failed to load fileController:', error);
  
  router.get("/map-data", (req: Request, res: Response) => {
    res.status(500).json({
      error: 'fileController not available',
      details: error.message
    });
  });
}

export default router;
