import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError, notFound } from "../utils/httpError.js";
import { paginated, success } from "../utils/responseHandler.js";
import { getPagination } from "../utils/pagination.js";
import { compact, toDate, toEnum } from "../utils/normalize.js";
import { createActivityLog } from "../services/activityLogService.js";
import { sendEmail } from "../services/emailService.js";

const prioritySchema = z.preprocess(toEnum, z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]));
const taskStatusSchema = z.preprocess(toEnum, z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]));

const taskFields = {
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  priority: prioritySchema.default("MEDIUM"),
  status: taskStatusSchema.default("PENDING"),
  dueDate: z.string().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  dealId: z.string().uuid().optional().nullable(),
  assignedUserId: z.string().uuid().optional().nullable()
};

export const listTasksSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    priority: prioritySchema.optional(),
    status: taskStatusSchema.optional(),
    assignedUserId: z.string().uuid().optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createTaskSchema = z.object({ body: z.object(taskFields) });
export const updateTaskSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object(taskFields).partial()
});
export const taskIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

const taskInclude = {
  assignedUser: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
  deal: { select: { id: true, title: true, stage: true, value: true } }
};

const ensureRecord = async (model, id, organizationId, label) => {
  if (!id) {
    return null;
  }

  const record = await prisma[model].findFirst({ where: { id, organizationId } });
  if (!record) {
    throw new HttpError(400, `${label} must belong to this organization`);
  }

  return record;
};

const buildTaskData = (body) =>
  compact({
    title: body.title,
    description: body.description,
    priority: body.priority,
    status: body.status,
    dueDate: toDate(body.dueDate),
    contactId: body.contactId === undefined ? undefined : body.contactId || null,
    dealId: body.dealId === undefined ? undefined : body.dealId || null,
    assignedUserId: body.assignedUserId === undefined ? undefined : body.assignedUserId || null
  });

export const listTasks = asyncHandler(async (req, res) => {
  const pagination = getPagination(req.validated.query);
  const { search, priority, status, assignedUserId } = req.validated.query;

  const where = {
    organizationId: req.organizationId,
    ...(priority ? { priority } : {}),
    ...(status ? { status } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { contact: { firstName: { contains: search, mode: "insensitive" } } },
            { deal: { title: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      skip: pagination.skip,
      take: pagination.take
    }),
    prisma.task.count({ where })
  ]);

  paginated(res, "tasks", tasks, total, pagination, "Tasks loaded");
});

export const createTask = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const assignedUser = await ensureRecord("user", body.assignedUserId, req.organizationId, "Assigned user");
  await ensureRecord("contact", body.contactId, req.organizationId, "Contact");
  await ensureRecord("deal", body.dealId, req.organizationId, "Deal");

  const task = await prisma.task.create({
    data: {
      ...buildTaskData(body),
      organizationId: req.organizationId
    },
    include: taskInclude
  });

  if (assignedUser?.email) {
    await sendEmail({
      organizationId: req.organizationId,
      to: assignedUser.email,
      subject: `New task assigned: ${task.title}`,
      templateName: "task_assigned",
      html: `<p>Hello ${assignedUser.name},</p><p>You were assigned a task: <strong>${task.title}</strong>.</p>`
    });
  }

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "task",
    entityId: task.id,
    action: "task.created",
    description: `${req.user.name} created task ${task.title}`
  });

  success(res, { task }, "Task created successfully", 201);
});

export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const body = req.validated.body;
  await ensureRecord("user", body.assignedUserId, req.organizationId, "Assigned user");
  await ensureRecord("contact", body.contactId, req.organizationId, "Contact");
  await ensureRecord("deal", body.dealId, req.organizationId, "Deal");

  const exists = await prisma.task.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Task");
  }

  const task = await prisma.task.update({
    where: { id },
    data: buildTaskData(body),
    include: taskInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "task",
    entityId: task.id,
    action: "task.updated",
    description: `${req.user.name} updated task ${task.title}`
  });

  success(res, { task }, "Task updated successfully");
});

export const completeTask = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.task.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Task");
  }

  const task = await prisma.task.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: taskInclude
  });

  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "task",
    entityId: task.id,
    action: "task.completed",
    description: `${req.user.name} completed task ${task.title}`
  });

  success(res, { task }, "Task completed successfully");
});

export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const exists = await prisma.task.findFirst({ where: { id, organizationId: req.organizationId } });
  if (!exists) {
    throw notFound("Task");
  }

  await prisma.task.delete({ where: { id } });
  await createActivityLog({
    organizationId: req.organizationId,
    userId: req.user.id,
    entityType: "task",
    entityId: id,
    action: "task.deleted",
    description: `${req.user.name} deleted task ${exists.title}`
  });

  success(res, {}, "Task deleted successfully");
});



