import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  inviteUser,
  inviteUserSchema,
  listPermissions,
  listUsers,
  updateUser,
  updateUserSchema
} from "../controllers/userController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.usersRead), listUsers);
router.get("/permissions", requirePermission(permissions.usersRead), listPermissions);
router.post("/", requirePermission(permissions.usersWrite), validate(inviteUserSchema), inviteUser);
router.put("/:id", requirePermission(permissions.usersWrite), validate(updateUserSchema), updateUser);

export default router;
