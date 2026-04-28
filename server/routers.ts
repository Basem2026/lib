import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { employeesRouter } from "./routers/employees";
import { customersRouter } from "./routers/customers";
import { cardsRouter } from "./routers/cards";
import { treasuryRouter } from "./routers/treasury";
import { logsRouter } from "./routers/logs";
import { unifiedRouter } from "./routers/unified";
import { accountsRouter } from "./routers/accounts";
import { operationsRouter } from "./routers/operations";
import { expensesRouter } from "./routers/expenses";
import { salariesRouter } from "./routers/salaries";
import { adminRouter } from "./routers/admin";
import { custodyRouter } from "./routers/custody";
import { auditLogsRouter } from "./routers/auditLogs";
import { delegatesRouter } from "./routers/delegates";
import { delegateCommissionsRouter } from "./routers/delegateCommissions";
import { companySettingsRouter } from "./routers/companySettings";
import { pushNotificationsRouter } from "./routers/pushNotifications";


export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Feature routers
  employees: employeesRouter,
  customers: customersRouter,
  cards: cardsRouter,
  treasury: treasuryRouter,
  logs: logsRouter,
  unified: unifiedRouter,
  accounts: accountsRouter,
  operations: operationsRouter,
  expenses: expensesRouter,
  salaries: salariesRouter,
  admin: adminRouter,
  custody: custodyRouter,
  auditLogs: auditLogsRouter,
  delegates: delegatesRouter,
  delegateCommissions: delegateCommissionsRouter,
  companySettings: companySettingsRouter,
  push: pushNotificationsRouter,

});

export type AppRouter = typeof appRouter;
