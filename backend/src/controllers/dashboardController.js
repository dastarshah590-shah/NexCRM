import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { success } from "../utils/responseHandler.js";

const money = (value) => Number(value || 0);

const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const buildMonthlySales = (invoices) => {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      label: date.toLocaleString("en", { month: "short" }),
      revenue: 0
    };
  });

  const map = new Map(months.map((month) => [month.key, month]));

  invoices.forEach((invoice) => {
    const key = monthKey(new Date(invoice.issuedDate));
    if (map.has(key)) {
      map.get(key).revenue += money(invoice.total);
    }
  });

  return months.map((month) => ({
    ...month,
    revenue: Number(month.revenue.toFixed(2))
  }));
};

export const getDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.organizationId;
  const monthStart = new Date();
  monthStart.setMonth(monthStart.getMonth() - 5, 1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalContacts,
    newLeads,
    totalDeals,
    wonDeals,
    lostDeals,
    pendingTasks,
    overdueTasks,
    pipeline,
    avgDeal,
    invoiceTotal,
    paidTotal,
    outstandingTotal,
    pipelineStages,
    recentContacts,
    recentTasks,
    activities,
    paidInvoices
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId } }),
    prisma.contact.count({ where: { organizationId, status: "LEAD" } }),
    prisma.deal.count({ where: { organizationId } }),
    prisma.deal.count({ where: { organizationId, status: "WON" } }),
    prisma.deal.count({ where: { organizationId, status: "LOST" } }),
    prisma.task.count({ where: { organizationId, status: { not: "COMPLETED" } } }),
    prisma.task.count({
      where: {
        organizationId,
        status: { not: "COMPLETED" },
        dueDate: { lt: new Date() }
      }
    }),
    prisma.deal.aggregate({
      where: { organizationId, status: "OPEN" },
      _sum: { value: true }
    }),
    prisma.deal.aggregate({
      where: { organizationId },
      _avg: { value: true }
    }),
    prisma.invoice.aggregate({
      where: { organizationId },
      _sum: { total: true }
    }),
    prisma.invoice.aggregate({
      where: { organizationId, status: "PAID" },
      _sum: { total: true }
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        status: { in: ["SENT", "OVERDUE"] }
      },
      _sum: { total: true }
    }),
    prisma.deal.groupBy({
      by: ["stage"],
      where: { organizationId },
      _count: { _all: true },
      _sum: { value: true }
    }),
    prisma.contact.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { assignedUser: { select: { id: true, name: true } } }
    }),
    prisma.task.findMany({
      where: { organizationId, status: { not: "COMPLETED" } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 6,
      include: {
        assignedUser: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } }
      }
    }),
    prisma.activityLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { id: true, name: true } } }
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: "PAID",
        issuedDate: { gte: monthStart }
      },
      select: { issuedDate: true, total: true }
    })
  ]);

  const closedDeals = wonDeals + lostDeals;
  const conversionRate = closedDeals ? Number(((wonDeals / closedDeals) * 100).toFixed(1)) : 0;

  success(res, {
    metrics: {
      totalContacts,
      newLeads,
      totalDeals,
      wonDeals,
      lostDeals,
      pendingTasks,
      overdueTasks,
      pipelineValue: money(pipeline._sum.value),
      averageDealValue: money(avgDeal._avg.value),
      invoiceRevenue: money(invoiceTotal._sum.total),
      paidRevenue: money(paidTotal._sum.total),
      outstandingAmount: money(outstandingTotal._sum.total),
      conversionRate
    },
    pipelineStages: pipelineStages.map((stage) => ({
      stage: stage.stage,
      count: stage._count._all,
      value: money(stage._sum.value)
    })),
    monthlySales: buildMonthlySales(paidInvoices),
    recentContacts,
    recentTasks,
    activities
  }, "Dashboard loaded");
});
