import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

const gratitudeEntrySchema = z.object({
  id: z.string(),
  text: z.string(),
  date: z.string(),
  color: z.string(),
});

const backupPayloadSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  isPremium: z.boolean(),
  entries: z.array(gratitudeEntrySchema),
});

const memoryStore: Map<string, z.infer<typeof backupPayloadSchema>> = new Map();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default createTRPCRouter({
  create: publicProcedure
    .input(backupPayloadSchema)
    .mutation(({ input }) => {
      const code = generateCode();
      memoryStore.set(code, input);
      setTimeout(() => memoryStore.delete(code), 1000 * 60 * 60); // expire after 1h
      return { code };
    }),
  get: publicProcedure
    .input(z.object({ code: z.string().min(4).max(12) }))
    .query(({ input }) => {
      const payload = memoryStore.get(input.code);
      if (!payload) {
        throw new Error("Backup not found or expired");
      }
      return payload;
    }),
});