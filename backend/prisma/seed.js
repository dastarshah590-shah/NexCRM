import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { calculateInvoiceTotal } from "../src/utils/calculateInvoiceTotal.js";

const prisma = new PrismaClient();

const organizationId = "8f6f95d4-74d4-4e5d-bb91-03a35d555001";
const users = {
  admin: "8f6f95d4-74d4-4e5d-bb91-03a35d555101",
  manager: "8f6f95d4-74d4-4e5d-bb91-03a35d555102",
  sales: "8f6f95d4-74d4-4e5d-bb91-03a35d555103",
  finance: "8f6f95d4-74d4-4e5d-bb91-03a35d555104"
};
const contacts = {
  ahmed: "8f6f95d4-74d4-4e5d-bb91-03a35d555201",
  maria: "8f6f95d4-74d4-4e5d-bb91-03a35d555202",
  jordan: "8f6f95d4-74d4-4e5d-bb91-03a35d555203"
};
const deals = {
  website: "8f6f95d4-74d4-4e5d-bb91-03a35d555301",
  retainer: "8f6f95d4-74d4-4e5d-bb91-03a35d555302",
  audit: "8f6f95d4-74d4-4e5d-bb91-03a35d555303"
};
const invoices = {
  first: "8f6f95d4-74d4-4e5d-bb91-03a35d555401"
};

const dateFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.organization.upsert({
    where: { id: organizationId },
    update: {
      name: "NexCRM Demo Workspace",
      industry: "Professional Services",
      website: "https://nexcrm.local",
      phone: "+1 555 0148",
      address: "Remote-first sales team",
      plan: "GROWTH"
    },
    create: {
      id: organizationId,
      name: "NexCRM Demo Workspace",
      industry: "Professional Services",
      website: "https://nexcrm.local",
      phone: "+1 555 0148",
      address: "Remote-first sales team",
      plan: "GROWTH"
    }
  });

  await prisma.emailLog.deleteMany({ where: { organizationId } });
  await prisma.activityLog.deleteMany({ where: { organizationId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { organizationId } } });
  await prisma.invoice.deleteMany({ where: { organizationId } });
  await prisma.task.deleteMany({ where: { organizationId } });
  await prisma.deal.deleteMany({ where: { organizationId } });
  await prisma.contact.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({ where: { organizationId } });

  await prisma.user.createMany({
    data: [
      {
        id: users.admin,
        organizationId,
        name: "Sara Khan",
        email: "admin@nexcrm.local",
        passwordHash,
        role: "ORG_ADMIN",
        status: "ACTIVE"
      },
      {
        id: users.manager,
        organizationId,
        name: "David Lee",
        email: "manager@nexcrm.local",
        passwordHash,
        role: "MANAGER",
        status: "ACTIVE"
      },
      {
        id: users.sales,
        organizationId,
        name: "Amina Patel",
        email: "sales@nexcrm.local",
        passwordHash,
        role: "SALES_USER",
        status: "ACTIVE"
      },
      {
        id: users.finance,
        organizationId,
        name: "Noah Carter",
        email: "finance@nexcrm.local",
        passwordHash,
        role: "FINANCE_USER",
        status: "ACTIVE"
      }
    ]
  });

  await prisma.contact.createMany({
    data: [
      {
        id: contacts.ahmed,
        organizationId,
        assignedUserId: users.sales,
        firstName: "Ahmed",
        lastName: "Ali",
        companyName: "Bright Solutions",
        email: "ahmed@example.com",
        phone: "+923001234567",
        source: "Website",
        status: "LEAD",
        tags: ["premium", "web"],
        notes: "Interested in a premium implementation package."
      },
      {
        id: contacts.maria,
        organizationId,
        assignedUserId: users.manager,
        firstName: "Maria",
        lastName: "Gomez",
        companyName: "Northstar Agency",
        email: "maria@example.com",
        phone: "+1 555 0192",
        source: "Referral",
        status: "CUSTOMER",
        tags: ["retainer", "agency"],
        notes: "Existing client exploring quarterly reporting."
      },
      {
        id: contacts.jordan,
        organizationId,
        assignedUserId: users.sales,
        firstName: "Jordan",
        lastName: "Miller",
        companyName: "BluePeak Studio",
        email: "jordan@example.com",
        phone: "+1 555 0111",
        source: "LinkedIn",
        status: "LEAD",
        tags: ["design", "audit"],
        notes: "Asked for process audit pricing."
      }
    ]
  });

  await prisma.deal.createMany({
    data: [
      {
        id: deals.website,
        organizationId,
        contactId: contacts.ahmed,
        assignedUserId: users.sales,
        title: "Website Development Deal",
        value: 1500,
        stage: "PROPOSAL_SENT",
        status: "OPEN",
        expectedCloseDate: dateFromNow(14)
      },
      {
        id: deals.retainer,
        organizationId,
        contactId: contacts.maria,
        assignedUserId: users.manager,
        title: "Quarterly Growth Retainer",
        value: 6400,
        stage: "NEGOTIATION",
        status: "OPEN",
        expectedCloseDate: dateFromNow(21)
      },
      {
        id: deals.audit,
        organizationId,
        contactId: contacts.jordan,
        assignedUserId: users.sales,
        title: "CRM Process Audit",
        value: 900,
        stage: "NEW_LEAD",
        status: "OPEN",
        expectedCloseDate: dateFromNow(30)
      }
    ]
  });

  await prisma.task.createMany({
    data: [
      {
        organizationId,
        contactId: contacts.ahmed,
        dealId: deals.website,
        assignedUserId: users.sales,
        title: "Follow up with Ahmed",
        description: "Call client about proposal questions.",
        priority: "HIGH",
        status: "PENDING",
        dueDate: dateFromNow(2)
      },
      {
        organizationId,
        contactId: contacts.maria,
        dealId: deals.retainer,
        assignedUserId: users.manager,
        title: "Review retainer scope",
        description: "Prepare negotiation notes before Friday.",
        priority: "MEDIUM",
        status: "IN_PROGRESS",
        dueDate: dateFromNow(4)
      },
      {
        organizationId,
        contactId: contacts.jordan,
        dealId: deals.audit,
        assignedUserId: users.sales,
        title: "Send audit discovery questions",
        description: "Collect current spreadsheet workflow details.",
        priority: "MEDIUM",
        status: "PENDING",
        dueDate: dateFromNow(7)
      }
    ]
  });

  const totals = calculateInvoiceTotal(
    [
      { description: "CRM implementation sprint", quantity: 1, unitPrice: 2200 },
      { description: "Data import and cleanup", quantity: 1, unitPrice: 450 }
    ],
    120,
    100
  );

  await prisma.invoice.create({
    data: {
      id: invoices.first,
      organizationId,
      contactId: contacts.maria,
      invoiceNumber: "NEX-202607-00001",
      status: "SENT",
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      dueDate: dateFromNow(10),
      items: { create: totals.items }
    }
  });

  await prisma.activityLog.createMany({
    data: [
      {
        organizationId,
        userId: users.admin,
        entityType: "organization",
        entityId: organizationId,
        action: "seed.created",
        description: "Demo workspace seeded"
      },
      {
        organizationId,
        userId: users.sales,
        entityType: "deal",
        entityId: deals.website,
        action: "deal.stage_updated",
        description: "Amina moved Website Development Deal to Proposal Sent"
      },
      {
        organizationId,
        userId: users.finance,
        entityType: "invoice",
        entityId: invoices.first,
        action: "invoice.sent",
        description: "Noah sent invoice NEX-202607-00001"
      }
    ]
  });

  console.log("NexCRM demo data seeded");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
