import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import backupRouter from "./routes/backup/router";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  backup: backupRouter,
});

export type AppRouter = typeof appRouter;