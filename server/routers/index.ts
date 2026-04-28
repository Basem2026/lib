import { transfersRouter } from './transfers';
import { treasuryRouter } from './treasury';
// ... others

export const appRouter = router({
  treasury: treasuryRouter,
  transfers: transfersRouter,
  // ...
});