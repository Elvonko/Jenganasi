import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { db } from "@/db/client";
import {
  accounts,
  rateLimits,
  sessions,
  twoFactors,
  users,
  verifications,
} from "@/db/schema";
import { sendMail } from "./mailer";

const secret = process.env.BETTER_AUTH_SECRET;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must be set to at least 32 characters.");
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const configuredOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "JengaNasi",
  baseURL,
  secret,
  trustedOrigins: [baseURL, ...configuredOrigins],
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 10,
    max: 100,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
      twoFactor: twoFactors,
    },
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Reset your JengaNasi password",
        text: `Use this link to reset your JengaNasi password: ${url}\nThis link expires in one hour.`,
        html: `<p>Use this link to reset your JengaNasi password:</p><p><a href="${url}">${url}</a></p><p>This link expires in one hour.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Verify your JengaNasi email",
        text: `Verify your email address: ${url}`,
        html: `<p>Verify your email address:</p><p><a href="${url}">${url}</a></p>`,
      });
    },
  },
  plugins: [twoFactor({ issuer: "JengaNasi" })],
  session: {
    expiresIn: 30 * 24 * 60 * 60,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});
