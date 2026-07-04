import sgMail from "@sendgrid/mail";
import { env } from "./env.js";

let configured = false;

if (env.sendgridApiKey) {
  sgMail.setApiKey(env.sendgridApiKey);
  configured = true;
}

export const sendgrid = sgMail;
export const isSendgridConfigured = () => configured && Boolean(env.sendgridFromEmail);
