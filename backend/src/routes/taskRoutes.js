import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  completeTask,
  createTask,
  createTaskSchema,
  deleteTask,
  listTasks,
  listTasksSchema,
  taskIdSchema,
  updateTask,
  updateTaskSchema
} from "../controllers/taskController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.tasksRead), validate(listTasksSchema), listTasks);
router.post("/", requirePermission(permissions.tasksWrite), validate(createTaskSchema), createTask);
router.put("/:id", requirePermission(permissions.tasksWrite), validate(updateTaskSchema), updateTask);
router.patch("/:id/complete", requirePermission(permissions.tasksWrite), validate(taskIdSchema), completeTask);
router.delete("/:id", requirePermission(permissions.tasksWrite), validate(taskIdSchema), deleteTask);

export default router;
