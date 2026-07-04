import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  createDeal,
  createDealSchema,
  dealIdSchema,
  deleteDeal,
  getDeal,
  listDeals,
  listDealsSchema,
  markDealLost,
  markDealWon,
  updateDeal,
  updateDealSchema,
  updateDealStage,
  updateDealStageSchema
} from "../controllers/dealController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.dealsRead), validate(listDealsSchema), listDeals);
router.post("/", requirePermission(permissions.dealsWrite), validate(createDealSchema), createDeal);
router.get("/:id", requirePermission(permissions.dealsRead), validate(dealIdSchema), getDeal);
router.put("/:id", requirePermission(permissions.dealsWrite), validate(updateDealSchema), updateDeal);
router.patch("/:id/stage", requirePermission(permissions.dealsWrite), validate(updateDealStageSchema), updateDealStage);
router.patch("/:id/won", requirePermission(permissions.dealsWrite), validate(dealIdSchema), markDealWon);
router.patch("/:id/lost", requirePermission(permissions.dealsWrite), validate(dealIdSchema), markDealLost);
router.delete("/:id", requirePermission(permissions.dealsWrite), validate(dealIdSchema), deleteDeal);

export default router;
