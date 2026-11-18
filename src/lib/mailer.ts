import "server-only";

import nodemailer from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

const developmentMessages: MailMessage[] = [];

export function getDevelopmentMessages(): readonly MailMessage[] {
  return developmentMessages;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const host = process.env.SMTP_HOST;

  if (!host) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST is required to send authentication emails in production.");
    }
    developmentMessages.push(message);
    console.info(`[mail] ${message.subject}\n${message.text}`);
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    ...(user && password ? { auth: { user, pass: password } } : {}),
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM ?? "JengaNasi <no-reply@localhost>",
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
