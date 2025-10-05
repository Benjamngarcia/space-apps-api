import { Router } from "express";

const { S3Controller } = require('../../src/controllers/S3Controller');
const { authMiddleware } = require('../../src/middleware/auth');

const router = Router();
const s3Controller = new S3Controller();

// Ruta protegida para listar archivos en S3
router.get("/files", authMiddleware, s3Controller.listFiles);
router.get("/files/latest", authMiddleware, s3Controller.readFile);
router.get("/files/latest-by-state", authMiddleware, s3Controller.getLatestDataByState);
router.get("/data", authMiddleware, s3Controller.getFileData);

export default router;
