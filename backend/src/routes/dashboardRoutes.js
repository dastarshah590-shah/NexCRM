import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { permissions } from "../utils/permissions.js";
import { getDashboard } from "../controllers/dashboardController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.reportsRead), getDashboard);

export default router;
