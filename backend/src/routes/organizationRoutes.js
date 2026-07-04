import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  getOrganization,
  listEmailLogs,
  updateOrganization,
  updateOrganizationSchema
} from "../controllers/organizationController.js";

const router = Router();

router.use(protect);
router.get("/organization", requirePermission(permissions.settingsRead), getOrganization);
router.put("/organization", requirePermission(permissions.settingsWrite), validate(updateOrganizationSchema), updateOrganization);
router.get("/email-logs", requirePermission(permissions.settingsRead), listEmailLogs);

export default router;
