import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validationMiddleware.js";
import { permissions } from "../utils/permissions.js";
import {
  createInvoice,
  createInvoiceSchema,
  deleteInvoice,
  getInvoice,
  invoiceIdSchema,
  listInvoices,
  listInvoicesSchema,
  markInvoicePaid,
  sendInvoice,
  updateInvoice,
  updateInvoiceSchema
} from "../controllers/invoiceController.js";

const router = Router();

router.use(protect);
router.get("/", requirePermission(permissions.invoicesRead), validate(listInvoicesSchema), listInvoices);
router.post("/", requirePermission(permissions.invoicesWrite), validate(createInvoiceSchema), createInvoice);
router.get("/:id", requirePermission(permissions.invoicesRead), validate(invoiceIdSchema), getInvoice);
router.put("/:id", requirePermission(permissions.invoicesWrite), validate(updateInvoiceSchema), updateInvoice);
router.patch("/:id/send", requirePermission(permissions.invoicesWrite), validate(invoiceIdSchema), sendInvoice);
router.patch("/:id/paid", requirePermission(permissions.invoicesWrite), validate(invoiceIdSchema), markInvoicePaid);
router.delete("/:id", requirePermission(permissions.invoicesWrite), validate(invoiceIdSchema), deleteInvoice);

export default router;
