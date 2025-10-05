import { Router } from "express";
import { S3Controller } from "../controllers/S3Controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const s3Controller = new S3Controller();

// Ruta protegida para listar archivos en S3
router.get("/files", authMiddleware, s3Controller.listFiles);
router.get("/files/latest", authMiddleware, s3Controller.readFile);
router.get("/files/latest-by-state", authMiddleware, s3Controller.getLatestDataByState);

export default router;
