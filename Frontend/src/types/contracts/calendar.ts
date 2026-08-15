import { z } from "zod";

export const calendarConnectionSchema = z.object({
  connected: z.boolean(),
  provider: z.literal("google").nullable(),
  accountEmail: z.string().nullable(),
  scopes: z.array(z.string()),
  lastSyncAt: z.string().nullable(),
  status: z.enum(["healthy", "expired", "error"]).nullable(),
});
