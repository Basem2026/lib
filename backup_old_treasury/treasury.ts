import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { treasuryRecords, treasuryAccounts, accountTransactions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const treasuryRouter = router({
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(treasuryRecords);
  }),

  create: publicProcedure
    .input(z.any())
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const insertData: any = {
        ...input,
        amount: input.amount?.toString() || "0",
        timestamp: new Date(),
      };
      await db.insert(treasuryRecords).values(insertData);
      return { success: true };
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: z.any(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { eq } = await import("drizzle-orm");
      await db.update(treasuryRecords)
        .set(input.updates)
        .where(eq(treasuryRecords.id, input.id));
      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { eq } = await import("drizzle-orm");
      await db.delete(treasuryRecords)
        .where(eq(treasuryRecords.id, input.id));
      return { success: true };
    }),

  // ==================== Treasury Accounts ====================
  getAllAccounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { eq, or } = await import("drizzle-orm");
    
    // جلب جميع الحسابات
    const accounts = await db.select().from(treasuryAccounts);
    
    // حساب الرصيد الفعلي لكل حساب من account_transactions
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        // جلب جميع المعاملات التي تؤثر على هذا الحساب
        const transactions = await db.select().from(accountTransactions)
          .where(
            or(
              eq(accountTransactions.fromAccountId, account.id),
              eq(accountTransactions.toAccountId, account.id)
            )
          );
        
        // حساب الرصيد: المبالغ الواردة - المبالغ الصادرة
        let balanceLYD = parseFloat(account.balanceLYD || "0");
        let balanceUSD = parseFloat(account.balanceUSD || "0");
        let balanceUSDT = parseFloat(account.balanceUSDT || "0");
        
        transactions.forEach((tx) => {
          const txAmountLYD = parseFloat(tx.amountLYD || "0");
          const txAmountUSD = parseFloat(tx.amountUSD || "0");
          const txAmountUSDT = parseFloat(tx.amountUSDT || "0");
          
          // إذا كان الحساب هو الوجهة (toAccountId)، نزيد الرصيد
          if (tx.toAccountId === account.id) {
            balanceLYD += txAmountLYD;
            balanceUSD += txAmountUSD;
            balanceUSDT += txAmountUSDT;
          }
          
          // إذا كان الحساب هو المصدر (fromAccountId)، ننقص الرصيد
          if (tx.fromAccountId === account.id) {
            balanceLYD -= txAmountLYD;
            balanceUSD -= txAmountUSD;
            balanceUSDT -= txAmountUSDT;
          }
        });
        
        return {
          ...account,
          balanceLYD: balanceLYD.toFixed(2),
          balanceUSD: balanceUSD.toFixed(2),
          balanceUSDT: balanceUSDT.toFixed(2),
        };
      })
    );
    
    return accountsWithBalances;
  }),

  getBankAccounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { eq, or, sql } = await import("drizzle-orm");
    
    // جلب جميع الحسابات البنكية
    const accounts = await db.select().from(treasuryAccounts)
      .where(eq(treasuryAccounts.accountType, "bank"));
    
    // حساب الرصيد الفعلي لكل حساب من account_transactions
    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        // جلب جميع المعاملات التي تؤثر على هذا الحساب
        const transactions = await db.select().from(accountTransactions)
          .where(
            or(
              eq(accountTransactions.fromAccountId, account.id),
              eq(accountTransactions.toAccountId, account.id)
            )
          );
        
        // حساب الرصيد: المبالغ الواردة - المبالغ الصادرة
        let balanceLYD = parseFloat(account.balanceLYD || "0");
        let balanceUSD = parseFloat(account.balanceUSD || "0");
        
        transactions.forEach((tx) => {
          const txAmountLYD = parseFloat(tx.amountLYD || "0");
          const txAmountUSD = parseFloat(tx.amountUSD || "0");
          
          // إذا كان الحساب هو الوجهة (toAccountId)، نزيد الرصيد
          if (tx.toAccountId === account.id) {
            balanceLYD += txAmountLYD;
            balanceUSD += txAmountUSD;
          }
          
          // إذا كان الحساب هو المصدر (fromAccountId)، ننقص الرصيد
          if (tx.fromAccountId === account.id) {
            balanceLYD -= txAmountLYD;
            balanceUSD -= txAmountUSD;
          }
        });
        
        return {
          ...account,
          balanceLYD: balanceLYD.toFixed(2),
          balanceUSD: balanceUSD.toFixed(2),
        };
      })
    );
    
    return accountsWithBalances;
  }),

  createAccount: publicProcedure
    .input(z.object({
      accountType: z.enum(["capital", "distribution", "profits", "cash", "usdt", "bank"]),
      accountName: z.string(),
      bankName: z.string().optional(),
      accountHolder: z.string().optional(),
      accountNumber: z.string().optional(),
      balanceLYD: z.string().optional(),
      balanceUSD: z.string().optional(),
      balanceUSDT: z.string().optional(),
      createdBy: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");
      
      const newAccount = {
        id: nanoid(),
        accountType: input.accountType,
        accountName: input.accountName,
        bankName: input.bankName || null,
        accountHolder: input.accountHolder || null,
        accountNumber: input.accountNumber || null,
        balanceLYD: input.balanceLYD || "0",
        balanceUSD: input.balanceUSD || "0",
        balanceUSDT: input.balanceUSDT || "0",
        isActive: true,
        createdBy: input.createdBy,
      };

      await db.insert(treasuryAccounts).values(newAccount);
      return { success: true, account: newAccount };
    }),

  // ==================== Account Transactions ====================
  recordTransaction: publicProcedure
    .input(z.object({
      transactionType: z.enum(["operation_revenue", "operation_expense", "distribution", "transfer"]),
      fromAccountType: z.enum(["capital", "intermediary", "treasury"]).nullable(),
      fromAccountId: z.string().nullable(),
      toAccountType: z.enum(["capital", "intermediary", "treasury"]).nullable(),
      toAccountId: z.string().nullable(),
      amountLYD: z.string(),
      amountUSD: z.string(),
      amountUSDT: z.string(),
      description: z.string(),
      processedBy: z.string(),
      processedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");
      
      const newTransaction = {
        id: nanoid(),
        transactionType: input.transactionType,
        fromAccountType: input.fromAccountType,
        fromAccountId: input.fromAccountId,
        toAccountType: input.toAccountType,
        toAccountId: input.toAccountId,
        amountLYD: input.amountLYD,
        amountUSD: input.amountUSD,
        amountUSDT: input.amountUSDT,
        description: input.description,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      };

      await db.insert(accountTransactions).values(newTransaction);
      return { success: true, transaction: newTransaction };
    }),

  // Get all account transactions
  getTransactions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { desc } = await import("drizzle-orm");
    return await db.select().from(accountTransactions).orderBy(desc(accountTransactions.timestamp));
  }),

  // Record card purchase (decrease cash)
  recordCardPurchase: publicProcedure
    .input(z.object({
      customerId: z.string(),
      customerName: z.string(),
      purchasePrice: z.number(),
      processedBy: z.string(),
      processedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");
      
      // تسجيل نقص من الكاش (شراء بطاقة)
      const transaction = {
        id: nanoid(),
        transactionType: "operation_expense" as const,
        fromAccountType: "treasury" as const,
        fromAccountId: "cash_lyd", // الكاش بالدينار
        toAccountType: null,
        toAccountId: null,
        amountLYD: input.purchasePrice.toFixed(2),
        amountUSD: "0.00",
        amountUSDT: "0.00",
        description: `شراء بطاقة للزبون: ${input.customerName} (${input.customerId})`,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      };

      await db.insert(accountTransactions).values(transaction);
      return { success: true, transaction };
    }),

  // Record deposit (decrease cash or bank account)
  recordDeposit: publicProcedure
    .input(z.object({
      customerId: z.string(),
      customerName: z.string(),
      depositAmount: z.number(),
      paymentMethod: z.enum(["cash", "bank"]),
      currency: z.enum(["LYD", "USD"]).optional(),
      bankAccountId: z.string().optional(),
      processedBy: z.string(),
      processedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");
      
      // تحديد الحساب المصدر حسب طريقة الدفع والعملة
      const currency = input.currency || "LYD";
      const fromAccountId = input.paymentMethod === "cash" 
        ? (currency === "LYD" ? "cash_lyd" : "cash_usd")
        : input.bankAccountId || "bank_lyd";
      
      const currencyText = currency === "LYD" ? "دينار" : "دولار";
      const description = input.paymentMethod === "cash"
        ? `إيداع للزبون: ${input.customerName} (كاش ${currencyText})`
        : `إيداع للزبون: ${input.customerName} (مصرفي - ${input.bankAccountId || "حساب بنكي"})`;
      
      // تحديد نوع المعاملة حسب طريقة الدفع
      // جميع الإيداعات هي operation_expense (مصروف من عملية)
      const transactionType = "operation_expense" as const;
      
      const transaction = {
        id: nanoid(),
        transactionType,
        fromAccountType: "treasury" as const,
        fromAccountId,
        toAccountType: null,
        toAccountId: null,
        amountLYD: input.depositAmount.toFixed(2),
        amountUSD: "0.00",
        amountUSDT: "0.00",
        description,
        processedBy: input.processedBy,
        processedByName: input.processedByName,
      };

      await db.insert(accountTransactions).values(transaction);
      
      // تحديث رصيد الحساب المصدر (خصم المبلغ)
      const currentAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, fromAccountId)).limit(1);
      
      if (currentAccount.length > 0) {
        const account = currentAccount[0];
        const currentBalance = currency === "LYD" 
          ? parseFloat(account.balanceLYD || "0")
          : parseFloat(account.balanceUSD || "0");
        
        const newBalance = (currentBalance - input.depositAmount).toFixed(2);
        
        // تحديث الرصيد حسب العملة
        if (currency === "LYD") {
          await db.update(treasuryAccounts)
            .set({ balanceLYD: newBalance })
            .where(eq(treasuryAccounts.id, fromAccountId));
        } else {
          await db.update(treasuryAccounts)
            .set({ balanceUSD: newBalance })
            .where(eq(treasuryAccounts.id, fromAccountId));
        }
      }
      
      return { success: true, transaction };
    }),

  // Record sale (increase cash and/or bank account)
  recordSale: publicProcedure
    .input(z.object({
      customerId: z.string(),
      customerName: z.string(),
      saleType: z.enum(["cash", "bank", "mixed"]),
      cashAmount: z.number().optional(),
      bankAmount: z.number().optional(),
      bankAccountId: z.string().optional(),
      processedBy: z.string(),
      processedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");
      
      const transactions = [];
      
      // إذا كان هناك بيع كاش
      if (input.saleType === "cash" || (input.saleType === "mixed" && input.cashAmount && input.cashAmount > 0)) {
        const cashTransaction = {
          id: nanoid(),
          transactionType: "operation_revenue" as const,
          fromAccountType: null,
          fromAccountId: null,
          toAccountType: "treasury" as const,
          toAccountId: "cash_lyd",
          amountLYD: (input.cashAmount || 0).toFixed(2),
          amountUSD: "0.00",
          amountUSDT: "0.00",
          description: `بيع بطاقة للزبون: ${input.customerName} (كاش)`,
          processedBy: input.processedBy,
          processedByName: input.processedByName,
        };
        transactions.push(cashTransaction);
        await db.insert(accountTransactions).values(cashTransaction);
      }
      
      // إذا كان هناك بيع مصرفي
      if (input.saleType === "bank" || (input.saleType === "mixed" && input.bankAmount && input.bankAmount > 0)) {
        const toAccountId = input.bankAccountId || "bank_lyd";
        const bankTransaction = {
          id: nanoid(),
          transactionType: "operation_revenue" as const,
          fromAccountType: null,
          fromAccountId: null,
          toAccountType: "treasury" as const,
          toAccountId,
          amountLYD: (input.bankAmount || 0).toFixed(2),
          amountUSD: "0.00",
          amountUSDT: "0.00",
          description: `بيع بطاقة للزبون: ${input.customerName} (مصرفي - ${input.bankAccountId || "حساب بنكي"})`,
          processedBy: input.processedBy,
          processedByName: input.processedByName,
        };
        transactions.push(bankTransaction);
        await db.insert(accountTransactions).values(bankTransaction);
      }

      return { success: true, transactions };
    }),

  // إيداع رأس المال
  depositCapital: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");

      const transaction = {
        id: nanoid(),
        transactionType: "capital_deposit" as const,
        fromAccountType: "treasury" as const,
        fromAccountId: "cash_lyd",
        toAccountType: "treasury" as const,
        toAccountId: "capital",
        amountLYD: input.amount.toFixed(2),
        amountUSD: "0.00",
        amountUSDT: "0.00",
        transactionDirection: "debit" as const, // خصم من الكاش
        description: input.description || "إيداع رأس مال من الكاش",
        processedBy: ctx.user.id ? String(ctx.user.id) : "system",
        processedByName: ctx.user.name || "نظام",
      };

      await db.insert(accountTransactions).values(transaction);

      // تحديث رصيد رأس المال (يزيد)
      const capitalAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "capital")).limit(1);
      if (capitalAccount.length > 0) {
        const currentBalance = parseFloat(capitalAccount[0].balanceLYD || "0");
        const newBalance = (currentBalance + input.amount).toFixed(2);
        await db.update(treasuryAccounts)
          .set({ balanceLYD: newBalance })
          .where(eq(treasuryAccounts.id, "capital"));
      }

      // تحديث رصيد الكاش (ينقص)
      const cashAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "cash_lyd")).limit(1);
      if (cashAccount.length > 0) {
        const currentBalance = parseFloat(cashAccount[0].balanceLYD || "0");
        const newBalance = (currentBalance - input.amount).toFixed(2);
        await db.update(treasuryAccounts)
          .set({ balanceLYD: newBalance })
          .where(eq(treasuryAccounts.id, "cash_lyd"));
      }

      return { success: true, transaction };
    }),

  // تحويل من رأس المال إلى حساب آخر
  transferFromCapital: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        toAccountId: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");

      // التحقق من الرصيد
      const currentAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "distribution")).limit(1);
      if (currentAccount.length === 0) {
        throw new Error("حساب التوزيع غير موجود");
      }
      const currentBalance = parseFloat(currentAccount[0].balanceLYD || "0");
      if (currentBalance < input.amount) {
        throw new Error("الرصيد غير كافٍ في حساب التوزيع");
      }

      const transaction = {
        id: nanoid(),
        transactionType: "transfer" as const,
        fromAccountType: "treasury" as const,
        fromAccountId: "distribution",
        toAccountType: "treasury" as const,
        toAccountId: input.toAccountId,
        amountLYD: input.amount.toFixed(2),
        amountUSD: "0.00",
        amountUSDT: "0.00",
        transactionDirection: "debit" as const, // خصم من حساب التوزيع
        description: input.description || `تحويل من حساب التوزيع إلى ${input.toAccountId}`,
        processedBy: ctx.user.id ? String(ctx.user.id) : "system",
        processedByName: ctx.user.name || "نظام",
      };

      await db.insert(accountTransactions).values(transaction);

      // خصم من حساب التوزيع
      const newFromBalance = (currentBalance - input.amount).toFixed(2);
      await db.update(treasuryAccounts)
        .set({ balanceLYD: newFromBalance })
        .where(eq(treasuryAccounts.id, "distribution"));

      // إضافة إلى الحساب المستهدف
      const toAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, input.toAccountId)).limit(1);
      if (toAccount.length > 0) {
        const toBalance = parseFloat(toAccount[0].balanceLYD || "0");
        const newToBalance = (toBalance + input.amount).toFixed(2);
        await db.update(treasuryAccounts)
          .set({ balanceLYD: newToBalance })
          .where(eq(treasuryAccounts.id, input.toAccountId));
      }

      return { success: true, transaction };
    }),

  // توزيع من حساب التوزيع إلى الحسابات
  recordDistribution: protectedProcedure
    .input(
      z.object({
        cashLyd: z.number().min(0),
        cashUsd: z.number().min(0),
        bankLyd: z.number().min(0),
        bankUsd: z.number().min(0),
        usdt: z.number().min(0),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { nanoid } = await import("nanoid");

      const total = input.cashLyd + input.cashUsd + input.bankLyd + input.bankUsd + input.usdt;
      if (total <= 0) {
        throw new Error("يجب إدخال مبلغ واحد على الأقل");
      }

      // التحقق من رصيد حساب التوزيع
      const distAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "distribution")).limit(1);
      if (distAccount.length === 0) {
        throw new Error("حساب التوزيع غير موجود");
      }
      const distBalance = parseFloat(distAccount[0].balanceLYD || "0");
      if (distBalance < total) {
        throw new Error("الرصيد غير كافٍ في حساب التوزيع");
      }

      const transactions = [];

      // توزيع كاش دينار
      if (input.cashLyd > 0) {
        const txn = {
          id: nanoid(),
          transactionType: "distribution" as const,
          fromAccountType: "treasury" as const,
          fromAccountId: "distribution",
          toAccountType: "treasury" as const,
          toAccountId: "cash_lyd",
          amountLYD: input.cashLyd.toFixed(2),
          amountUSD: "0.00",
          amountUSDT: "0.00",
          transactionDirection: "debit" as const, // خصم من حساب التوزيع
          description: `توزيع - كاش دينار: ${input.description || ""}`,
          processedBy: ctx.user.id ? String(ctx.user.id) : "system",
          processedByName: ctx.user.name || "نظام",
        };
        transactions.push(txn);
        await db.insert(accountTransactions).values(txn);

        // تحديث رصيد الكاش
        const cashAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "cash_lyd")).limit(1);
        if (cashAccount.length > 0) {
          const cashBalance = parseFloat(cashAccount[0].balanceLYD || "0");
          const newBalance = (cashBalance + input.cashLyd).toFixed(2);
          await db.update(treasuryAccounts)
            .set({ balanceLYD: newBalance })
            .where(eq(treasuryAccounts.id, "cash_lyd"));
        }
      }

      // توزيع كاش دولار
      if (input.cashUsd > 0) {
        const txn = {
          id: nanoid(),
          transactionType: "distribution" as const,
          fromAccountType: "treasury" as const,
          fromAccountId: "distribution",
          toAccountType: "treasury" as const,
          toAccountId: "cash_usd",
          amountLYD: "0.00",
          amountUSD: input.cashUsd.toFixed(2),
          amountUSDT: "0.00",
          transactionDirection: "debit" as const, // خصم من حساب التوزيع
          description: `توزيع - كاش دولار: ${input.description || ""}`,
          processedBy: ctx.user.id ? String(ctx.user.id) : "system",
          processedByName: ctx.user.name || "نظام",
        };
        transactions.push(txn);
        await db.insert(accountTransactions).values(txn);

        const cashAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "cash_usd")).limit(1);
        if (cashAccount.length > 0) {
          const cashBalance = parseFloat(cashAccount[0].balanceUSD || "0");
          const newBalance = (cashBalance + input.cashUsd).toFixed(2);
          await db.update(treasuryAccounts)
            .set({ balanceUSD: newBalance })
            .where(eq(treasuryAccounts.id, "cash_usd"));
        }
      }

      // توزيع USDT
      if (input.usdt > 0) {
        const txn = {
          id: nanoid(),
          transactionType: "distribution" as const,
          fromAccountType: "treasury" as const,
          fromAccountId: "distribution",
          toAccountType: "treasury" as const,
          toAccountId: "usdt",
          amountLYD: "0.00",
          amountUSD: "0.00",
          amountUSDT: input.usdt.toFixed(2),
          transactionDirection: "debit" as const, // خصم من حساب التوزيع
          description: `توزيع - USDT: ${input.description || ""}`,
          processedBy: ctx.user.id ? String(ctx.user.id) : "system",
          processedByName: ctx.user.name || "نظام",
        };
        transactions.push(txn);
        await db.insert(accountTransactions).values(txn);

        const usdtAccount = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, "usdt")).limit(1);
        if (usdtAccount.length > 0) {
          const usdtBalance = parseFloat(usdtAccount[0].balanceUSDT || "0");
          const newBalance = (usdtBalance + input.usdt).toFixed(2);
          await db.update(treasuryAccounts)
            .set({ balanceUSDT: newBalance })
            .where(eq(treasuryAccounts.id, "usdt"));
        }
      }

      // خصم الإجمالي من حساب التوزيع
      const newDistBalance = (distBalance - total).toFixed(2);
      await db.update(treasuryAccounts)
        .set({ balanceLYD: newDistBalance })
        .where(eq(treasuryAccounts.id, "distribution"));

      return { success: true, transactions };
    }),
});
