import "server-only";

import { eq } from "drizzle-orm";
import { db, ensureDatabase } from "@/db/client";
import { rateLimits } from "@/db/schema";

export type AbuseLimitResult = { allowed: boolean; retryAfterSeconds: number };

const FIXED_WINDOW_MS = 60 * 60 * 1000;

export async function consumeAbuseAllowance(
  key: string,
  max: number,
): Promise<AbuseLimitResult> {
  await ensureDatabase();
  const now = Date.now();
  const row = (await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1))[0];

  if (!row || row.lastRequest <= now - FIXED_WINDOW_MS) {
    await db
      .insert(rateLimits)
      .values({ id: key, key, count: 1, lastRequest: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, lastRequest: now },
      });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((row.lastRequest + FIXED_WINDOW_MS - now) / 1000),
      ),
    };
  }

  await db
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.key, key));
  return { allowed: true, retryAfterSeconds: 0 };
}
