// client/src/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/trpc';  // عدل المسار حسب هيكل مشروعك

export const trpc = createTRPCReact<AppRouter>();