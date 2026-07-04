import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  contactIdSchema,
  createContact,
  createContactSchema,
  deleteContact,
  getContact,
  listContacts,
  listContactsSchema,
  updateContact,
  updateContactSchema
} from "../controllers/contactController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.contactsRead), validate(listContactsSchema), listContacts);
router.post("/", requirePermission(permissions.contactsWrite), validate(createContactSchema), createContact);
router.get("/:id", requirePermission(permissions.contactsRead), validate(contactIdSchema), getContact);
router.put("/:id", requirePermission(permissions.contactsWrite), validate(updateContactSchema), updateContact);
router.delete("/:id", requirePermission(permissions.contactsWrite), validate(contactIdSchema), deleteContact);

export default router;
