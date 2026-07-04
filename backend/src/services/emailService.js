import { prisma } from "../config/prisma.js";
import { sendgrid, isSendgridConfigured } from "../config/sendgrid.js";
import { env } from "../config/env.js";

export const sendEmail = async ({ organizationId, to, subject, html, templateName }) => {
  if (!to || !subject) {
    return { success: false, message: "Recipient and subject are required" };
  }

  if (!isSendgridConfigured()) {
    await prisma.emailLog.create({
      data: {
        organizationId,
        recipientEmail: to,
        subject,
        templateName,
        status: "SKIPPED",
        errorMessage: "SendGrid is not configured for this local environment"
      }
    });

    return {
      success: true,
      skipped: true,
      message: "Email skipped because SendGrid is not configured"
    };
  }

  try {
    await sendgrid.send({
      to,
      from: env.sendgridFromEmail,
      subject,
      html
    });

    await prisma.emailLog.create({
      data: {
        organizationId,
        recipientEmail: to,
        subject,
        templateName,
        status: "SENT",
        sentAt: new Date()
      }
    });

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    await prisma.emailLog.create({
      data: {
        organizationId,
        recipientEmail: to,
        subject,
        templateName,
        status: "FAILED",
        errorMessage: error.message
      }
    });

    return { success: false, message: "Failed to send email", error: error.message };
  }
};

export const sendInvoiceEmail = async (invoice) => {
  const contact = invoice.contact;

  if (!contact?.email) {
    return {
      success: false,
      message: "Invoice contact does not have an email address"
    };
  }

  const itemRows = invoice.items
    .map(
      (item) =>
        `<tr><td>${item.description}</td><td>${item.quantity}</td><td>$${item.unitPrice}</td><td>$${item.total}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <h2>Invoice ${invoice.invoiceNumber}</h2>
      <p>Hello ${contact.firstName},</p>
      <p>Please find your invoice summary below.</p>
      <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;width:100%">
        <thead><tr><th align="left">Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <p><strong>Total due: $${invoice.total}</strong></p>
    </div>
  `;

  return sendEmail({
    organizationId: invoice.organizationId,
    to: contact.email,
    subject: `Invoice ${invoice.invoiceNumber}`,
    html,
    templateName: "invoice_sent"
  });
};
