import { Router } from "express";

const { fileController } = require('../../src/controllers/fileController');
const { authMiddleware } = require('../../src/middleware/auth');

const router = Router();
const fileCon = new fileController();

router.get("/map-data", authMiddleware, fileCon.processMapData);
router.get("/zip/:zip", authMiddleware, fileCon.getDataByZip);

export default router;
