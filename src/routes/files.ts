import { Router } from "express";
import { fileController } from "../controllers/fileController";
import { authMiddleware } from "../middleware/auth";

const router = Router();
const fileCon = new fileController();

router.get("/map-data", authMiddleware, fileCon.processMapData);
router.get("/zip/:zip", authMiddleware, fileCon.getDataByZip);

export default router;