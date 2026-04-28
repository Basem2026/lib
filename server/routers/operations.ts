import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dailyOperations, accountTransactions, auditLogs, treasuryAccounts, treasuryRecords } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const OPERATION_TYPE_LABELS: Record<string, string> = {
  card_withdrawal: 'سحب بطاقة',
  transfer_deposit: 'تحويل / إيداع',
  aman_exchange: 'صيرفة الأمان',
  dollar_buy_cash: 'شراء دولار نقدي',
  dollar_buy_bank: 'شراء دولار مصرفي',
  dollar_sell_cash: 'بيع دولار نقدي',
  dollar_sell_bank: 'بيع دولار مصرفي',
  usdt_buy_cash: 'شراء USDT نقدي',
  usdt_buy_bank: 'شراء USDT مصرفي',
  usdt_sell_cash: 'بيع USDT نقدي',
  usdt_sell_bank: 'بيع USDT مصرفي',
  dollar_card_withdrawal: 'سحب بطاقة دولار',
};

// دالة مساعدة لتحديث الخزينة مباشرة
async function updateTreasuryBalances(db: any, input: any, operationId: string, processedBy: string) {
  const updateBalance = async (accountId: string, amountLYD?: number, amountUSD?: number, amountUSDT?: number, description?: string) => {
    const [account] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, accountId)).limit(1);
    if (!account) return;

    const updates: any = {};
    if (amountLYD !== undefined) {
      updates.balanceLYD = (parseFloat(account.balanceLYD || "0") + amountLYD).toFixed(2);
    }
    if (amountUSD !== undefined) {
      updates.balanceUSD = (parseFloat(account.balanceUSD || "0") + amountUSD).toFixed(2);
    }
    if (amountUSDT !== undefined) {
      updates.balanceUSDT = (parseFloat(account.balanceUSDT || "0") + amountUSDT).toFixed(2);
    }

    await db.update(treasuryAccounts).set(updates).where(eq(treasuryAccounts.id, accountId));
    
    // تسجيل في treasury_records
    const amount = Math.abs(amountLYD || amountUSD || amountUSDT || 0);
    const currency = amountUSDT !== undefined ? 'USDT' : (amountUSD !== undefined ? 'USD' : 'LYD');
    const type = (amountLYD || amountUSD || amountUSDT || 0) > 0 ? 'deposit' : 'withdrawal';
    
    await db.insert(treasuryRecords).values({
      id: nanoid(),
      type,
      amount: amount.toFixed(2),
      currency,
      description: description || 'عملية يومية',
      reference: `OP-${operationId}`,
      processedBy,
      data: { accountId, operationId },
    });
  };

  // سحب بطاقة
  if (input.operationType === "card_withdrawal") {
    if (input.bankAccountId && input.customerTransferAmount) {
      await updateBalance(input.bankAccountId, input.customerTransferAmount, undefined, undefined, 'سحب بطاقة - استلام من الزبون');
    }
    if (input.deliveredToCustomer) {
      await updateBalance("cash_lyd", -input.deliveredToCustomer, undefined, undefined, 'سحب بطاقة - تسليم للزبون');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح سحب بطاقة');
    }
  }

  // تحويلات/إيداعات
  if (input.operationType === "transfer_deposit") {
    if (input.transferType === "account_to_cash") {
      if (input.bankAccountId && input.customerPaidAmount) {
        await updateBalance(input.bankAccountId, input.customerPaidAmount, undefined, undefined, 'تحويل - استلام في الحساب');
      }
      if (input.deliveredToCustomerTransfer) {
        await updateBalance("cash_lyd", -input.deliveredToCustomerTransfer, undefined, undefined, 'تحويل - تسليم كاش');
      }
    } else if (input.transferType === "cash_to_account") {
      if (input.customerPaidAmount) {
        await updateBalance("cash_lyd", input.customerPaidAmount, undefined, undefined, 'تحويل - استلام كاش');
      }
      if (input.bankAccountId && input.deliveredToCustomerTransfer) {
        await updateBalance(input.bankAccountId, -input.deliveredToCustomerTransfer, undefined, undefined, 'تحويل - تسليم في الحساب');
      }
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح تحويل');
    }
  }

  // صيرفة الأمان (نفس منطق التحويلات)
  if (input.operationType === "aman_exchange") {
    if (input.transferType === "account_to_cash") {
      if (input.bankAccountId && input.customerPaidAmount) {
        await updateBalance(input.bankAccountId, input.customerPaidAmount, undefined, undefined, 'صيرفة الأمان - استلام في الحساب');
      }
      if (input.deliveredToCustomerTransfer) {
        await updateBalance("cash_lyd", -input.deliveredToCustomerTransfer, undefined, undefined, 'صيرفة الأمان - تسليم كاش');
      }
    } else if (input.transferType === "cash_to_account") {
      if (input.customerPaidAmount) {
        await updateBalance("cash_lyd", input.customerPaidAmount, undefined, undefined, 'صيرفة الأمان - استلام كاش');
      }
      if (input.bankAccountId && input.deliveredToCustomerTransfer) {
        await updateBalance(input.bankAccountId, -input.deliveredToCustomerTransfer, undefined, undefined, 'صيرفة الأمان - تسليم في الحساب');
      }
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح صيرفة الأمان');
    }
  }

  // شراء دولار - كاش
  if (input.operationType === "dollar_buy_cash") {
    if (input.dollarAmount && input.buyPrice) {
      const lydAmount = input.dollarAmount * input.buyPrice;
      await updateBalance("cash_lyd", -lydAmount, undefined, undefined, 'شراء دولار - نقص كاش دينار');
    }
    if (input.dollarAmount) {
      await updateBalance("cash_usd", undefined, input.dollarAmount, undefined, 'شراء دولار - زيادة كاش دولار');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح شراء دولار');
    }
  }

  // شراء دولار - مصرفي
  if (input.operationType === "dollar_buy_bank") {
    if (input.bankAccountId && input.dollarAmount && input.marketPrice) {
      const lydAmount = input.dollarAmount * input.marketPrice;
      await updateBalance(input.bankAccountId, -lydAmount, undefined, undefined, 'شراء دولار - نقص حساب بنكي');
    }
    if (input.dollarAmount) {
      await updateBalance("cash_usd", undefined, input.dollarAmount, undefined, 'شراء دولار - زيادة كاش دولار');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح شراء دولار');
    }
  }

  // بيع دولار - كاش
  if (input.operationType === "dollar_sell_cash") {
    if (input.dollarAmount && input.marketPrice) {
      const lydAmount = input.dollarAmount * input.marketPrice;
      await updateBalance("cash_lyd", lydAmount, undefined, undefined, 'بيع دولار - زيادة كاش دينار');
    }
    if (input.dollarAmount) {
      await updateBalance("cash_usd", undefined, -input.dollarAmount, undefined, 'بيع دولار - نقص كاش دولار');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح بيع دولار');
    }
  }

  // بيع دولار - مصرفي
  if (input.operationType === "dollar_sell_bank") {
    if (input.bankAccountId && input.dollarAmount && input.marketPrice) {
      const lydAmount = input.dollarAmount * input.marketPrice;
      await updateBalance(input.bankAccountId, lydAmount, undefined, undefined, 'بيع دولار - زيادة حساب بنكي');
    }
    if (input.dollarAmount) {
      await updateBalance("cash_usd", undefined, -input.dollarAmount, undefined, 'بيع دولار - نقص كاش دولار');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح بيع دولار');
    }
  }

  // شراء USDT - كاش
  if (input.operationType === "usdt_buy_cash") {
    if (input.totalAmount) {
      await updateBalance("cash_lyd", -input.totalAmount, undefined, undefined, 'شراء USDT - نقص كاش دينار');
    }
    if (input.usdtAmount) {
      await updateBalance("usdt", undefined, undefined, input.usdtAmount, 'شراء USDT - زيادة USDT');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح شراء USDT');
    }
  }

  // شراء USDT - مصرفي
  if (input.operationType === "usdt_buy_bank") {
    if (input.bankAccountId && input.totalAmount) {
      await updateBalance(input.bankAccountId, -input.totalAmount, undefined, undefined, 'شراء USDT - نقص حساب بنكي');
    }
    if (input.usdtAmount) {
      await updateBalance("usdt", undefined, undefined, input.usdtAmount, 'شراء USDT - زيادة USDT');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح شراء USDT');
    }
  }

  // بيع USDT - كاش
  if (input.operationType === "usdt_sell_cash") {
    if (input.dinarPaidToCustomer) {
      await updateBalance("cash_lyd", input.dinarPaidToCustomer, undefined, undefined, 'بيع USDT - زيادة كاش دينار');
    }
    if (input.amountToOurAccount) {
      await updateBalance("usdt", undefined, undefined, -input.amountToOurAccount, 'بيع USDT - نقص USDT');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح بيع USDT');
    }
  }

  // بيع USDT - مصرفي
  if (input.operationType === "usdt_sell_bank") {
    if (input.bankAccountId && input.dinarPaidToCustomer) {
      await updateBalance(input.bankAccountId, input.dinarPaidToCustomer, undefined, undefined, 'بيع USDT - زيادة حساب بنكي');
    }
    if (input.amountToOurAccount) {
      await updateBalance("usdt", undefined, undefined, -input.amountToOurAccount, 'بيع USDT - نقص USDT');
    }
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح بيع USDT');
    }
  }

  // سحب بطاقات الدولار
  if (input.operationType === "dollar_card_withdrawal") {
    if (input.profit > 0) {
      await updateBalance("profits", input.profit, undefined, undefined, 'ربح سحب بطاقة الدولار');
    }
  }
}

export const operationsRouter = router({
  // Get all operations
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(dailyOperations).orderBy(desc(dailyOperations.createdAt));
  }),

  // Get operation by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(dailyOperations).where(eq(dailyOperations.id, input.id)).limit(1);
      return result[0] || null;
    }),

  // Create operation - نموذج ديناميكي كامل
  create: publicProcedure
    .input(
      z.object({
        // نوع العملية
        operationType: z.enum([
          "card_withdrawal",
          "transfer_deposit",
          "aman_exchange",
          "dollar_buy_cash",
          "dollar_buy_bank",
          "dollar_sell_cash",
          "dollar_sell_bank",
          "usdt_buy_cash",
          "usdt_buy_bank",
          "usdt_sell_cash",
          "usdt_sell_bank",
          "dollar_card_withdrawal",
        ]),
        
        // بيانات عامة
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        paymentMethod: z.enum(["cash", "bank"]).default("cash"),
        bankAccountId: z.string().optional(),
        notes: z.string().optional(),
        profit: z.number(),
        createdBy: z.string(),
        createdByName: z.string(),
        
        // سحب بطاقة
        deliveredToCustomer: z.number().optional(),
        customerTransferAmount: z.number().optional(),
        discountPercentage: z.number().optional(),
        
        // تحويلات/إيداعات
        transferType: z.enum(["account_to_cash", "cash_to_account"]).optional(),
        customerPaidAmount: z.number().optional(),
        transferPercentage: z.number().optional(),
        percentageType: z.enum(["increase", "discount"]).optional(),
        deliveredToCustomerTransfer: z.number().optional(),
        
        // شراء/بيع دولار
        dollarAmount: z.number().optional(),
        dinarDeliveredToCustomer: z.number().optional(),
        dinarReceivedFromCustomer: z.number().optional(),
        buyPrice: z.number().optional(),
        sellPrice: z.number().optional(),
        marketPrice: z.number().optional(),
        referencePrice: z.number().optional(),
        
        // USDT
        usdtAmount: z.number().optional(),
        usdtCommissionPercentage: z.number().optional(),
        networkFee: z.number().optional(),
        amountToOurAccount: z.number().optional(),
        dinarPaidToCustomer: z.number().optional(),
        dollarPaidToCustomer: z.number().optional(),
        totalAmount: z.number().optional(),
        
        // سحب بطاقات الدولار
        withdrawnDollar: z.number().optional(),
        machinePercentage: z.number().optional(),
        companyPercentage: z.number().optional(),
        totalPercentage: z.number().optional(),
        laterSellPrice: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const operationId = nanoid();

      // بناء البيانات للإدخال
      const data: any = {
        id: operationId,
        operationType: input.operationType,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        paymentMethod: input.paymentMethod,
        bankAccountId: input.bankAccountId || null,
        notes: input.notes || null,
        profit: input.profit.toFixed(2),
        createdBy: input.createdBy,
        createdByName: input.createdByName,
      };

      // إضافة الحقول حسب نوع العملية
      if (input.deliveredToCustomer !== undefined) data.deliveredToCustomer = input.deliveredToCustomer.toFixed(2);
      if (input.customerTransferAmount !== undefined) data.customerTransferAmount = input.customerTransferAmount.toFixed(2);
      if (input.discountPercentage !== undefined) data.discountPercentage = input.discountPercentage.toFixed(2);
      
      if (input.transferType) data.transferType = input.transferType;
      if (input.customerPaidAmount !== undefined) data.customerPaidAmount = input.customerPaidAmount.toFixed(2);
      if (input.transferPercentage !== undefined) data.transferPercentage = input.transferPercentage.toFixed(2);
      if (input.percentageType) data.percentageType = input.percentageType;
      if (input.deliveredToCustomerTransfer !== undefined) data.deliveredToCustomerTransfer = input.deliveredToCustomerTransfer.toFixed(2);
      
      if (input.dollarAmount !== undefined) data.dollarAmount = input.dollarAmount.toFixed(2);
      if (input.dinarDeliveredToCustomer !== undefined) data.dinarDeliveredToCustomer = input.dinarDeliveredToCustomer.toFixed(2);
      if (input.dinarReceivedFromCustomer !== undefined) data.dinarReceivedFromCustomer = input.dinarReceivedFromCustomer.toFixed(2);
      if (input.buyPrice !== undefined) data.buyPrice = input.buyPrice.toFixed(4);
      if (input.sellPrice !== undefined) data.sellPrice = input.sellPrice.toFixed(4);
      if (input.marketPrice !== undefined) data.marketPrice = input.marketPrice.toFixed(4);
      if (input.referencePrice !== undefined) data.referencePrice = input.referencePrice.toFixed(4);
      
      if (input.usdtAmount !== undefined) data.usdtAmount = input.usdtAmount.toFixed(2);
      if (input.usdtCommissionPercentage !== undefined) data.usdtCommissionPercentage = input.usdtCommissionPercentage.toFixed(2);
      if (input.networkFee !== undefined) data.networkFee = input.networkFee.toFixed(2);
      if (input.amountToOurAccount !== undefined) data.amountToOurAccount = input.amountToOurAccount.toFixed(2);
      if (input.dinarPaidToCustomer !== undefined) data.dinarPaidToCustomer = input.dinarPaidToCustomer.toFixed(2);
      if (input.dollarPaidToCustomer !== undefined) data.dollarPaidToCustomer = input.dollarPaidToCustomer.toFixed(2);
      if (input.totalAmount !== undefined) data.totalAmount = input.totalAmount.toFixed(2);
      
      if (input.withdrawnDollar !== undefined) data.withdrawnDollar = input.withdrawnDollar.toFixed(2);
      if (input.machinePercentage !== undefined) data.machinePercentage = input.machinePercentage.toFixed(2);
      if (input.companyPercentage !== undefined) data.companyPercentage = input.companyPercentage.toFixed(2);
      if (input.totalPercentage !== undefined) data.totalPercentage = input.totalPercentage.toFixed(2);
      if (input.laterSellPrice !== undefined) data.laterSellPrice = input.laterSellPrice.toFixed(4);

      // إنشاء العملية
      await db.insert(dailyOperations).values(data);

      // ربط بالخزينة - عملية سحب بطاقة
      if (input.operationType === "card_withdrawal" && input.customerTransferAmount && input.deliveredToCustomer) {
        const now = new Date();
        
        // 1. زيادة الحساب البنكي المختار (القيمة المستلمة من الزبون)
        if (input.bankAccountId) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: input.bankAccountId,
            amountLYD: input.customerTransferAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `سحب بطاقة - استلام من الزبون (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
        }
        
        // 2. نقص كاش دينار (القيمة المسلّمة للزبون)
        await db.insert(accountTransactions).values({
          id: nanoid(),
          transactionType: 'operation_expense',
          fromAccountType: 'treasury',
          fromAccountId: 'cash_lyd',
          toAccountType: null,
          toAccountId: null,
          amountLYD: input.deliveredToCustomer.toFixed(2),
          amountUSD: '0',
          amountUSDT: '0',
          description: `سحب بطاقة - تسليم للزبون (${input.customerName || 'غير محدد'})`,
          relatedEntityType: 'operation',
          relatedEntityId: operationId,
          processedBy: 'system',
          processedByName: 'النظام',
          timestamp: now,
        });
        
        // 3. تسجيل الربح
        if (input.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: input.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح سحب بطاقة (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
        }
      }

      // ربط بالخزينة - عملية تحويلات/إيداعات
      if (input.operationType === "transfer_deposit" && input.transferType && input.customerPaidAmount && input.deliveredToCustomerTransfer) {
        const now = new Date();
        
        if (input.transferType === "account_to_cash") {
          // من الحساب إلى كاش
          
          // 1. زيادة الحساب البنكي (الزبون يودع في حسابك)
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_revenue',
              fromAccountType: null,
              fromAccountId: null,
              toAccountType: 'treasury',
              toAccountId: input.bankAccountId,
              amountLYD: input.customerPaidAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `تحويل من الحساب إلى كاش - إيداع في الحساب (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
          
          // 2. نقص كاش دينار (أنت تعطيه كاش)
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_lyd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: input.deliveredToCustomerTransfer.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `تحويل من الحساب إلى كاش - تسليم للزبون (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
        } else if (input.transferType === "cash_to_account") {
          // من كاش إلى الحساب
          
          // 1. زيادة كاش دينار (الزبون يعطيك كاش)
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: input.customerPaidAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `تحويل من كاش إلى الحساب - استلام من الزبون (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص الحساب البنكي (أنت تحول له من حسابك)
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_expense',
              fromAccountType: 'treasury',
              fromAccountId: input.bankAccountId,
              toAccountType: null,
              toAccountId: null,
              amountLYD: input.deliveredToCustomerTransfer.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `تحويل من كاش إلى الحساب - تحويل للزبون (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
        }
        
        // 3. تسجيل الربح (إن وجد)
        if (input.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: input.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح تحويل/إيداع (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
        }
      }

      // ربط بالخزينة - عملية صيرفة الأمان
      if (input.operationType === "aman_exchange" && input.transferType && input.customerPaidAmount && input.deliveredToCustomerTransfer) {
        const now = new Date();
        
        if (input.transferType === "account_to_cash") {
          // من الحساب إلى كاش
          
          // 1. زيادة الحساب البنكي (الزبون يودع في حسابك)
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_revenue',
              fromAccountType: null,
              fromAccountId: null,
              toAccountType: 'treasury',
              toAccountId: input.bankAccountId,
              amountLYD: input.customerPaidAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `صيرفة الأمان - من الحساب إلى كاش - إيداع في الحساب (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
          
          // 2. نقص كاش دينار (أنت تعطيه كاش)
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_lyd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: input.deliveredToCustomerTransfer.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `صيرفة الأمان - من الحساب إلى كاش - تسليم للزبون (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
        } else if (input.transferType === "cash_to_account") {
          // من كاش إلى الحساب
          
          // 1. زيادة كاش دينار (الزبون يعطيك كاش)
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: input.customerPaidAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `صيرفة الأمان - من كاش إلى الحساب - استلام من الزبون (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص الحساب البنكي (أنت تحول له من حسابك)
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_expense',
              fromAccountType: 'treasury',
              fromAccountId: input.bankAccountId,
              toAccountType: null,
              toAccountId: null,
              amountLYD: input.deliveredToCustomerTransfer.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `صيرفة الأمان - من كاش إلى الحساب - تحويل للزبون (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
        }
        
        // 3. تسجيل الربح (إن وجد)
        if (input.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: input.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح صيرفة الأمان (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
        }
      }

      // ربط بالخزينة - عمليات شراء/بيع الدولار
      if (
        (input.operationType === "dollar_buy_cash" || 
         input.operationType === "dollar_buy_bank" ||
         input.operationType === "dollar_sell_cash" ||
         input.operationType === "dollar_sell_bank") &&
        input.dollarAmount
      ) {
        const now = new Date();
        // استخدام buyPrice لعمليات الشراء و sellPrice لعمليات البيع
        const price = (input.operationType === "dollar_buy_cash" || input.operationType === "dollar_buy_bank") 
          ? input.buyPrice 
          : input.sellPrice;
        const lydAmount = input.dollarAmount * (price || input.marketPrice || 0);
        
        if (input.operationType === "dollar_buy_cash") {
          // شراء دولار - كاش
          
          // 1. زيادة دولار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_usd',
            amountLYD: '0',
            amountUSD: input.dollarAmount.toFixed(2),
            amountUSDT: '0',
            description: `شراء دولار - كاش - زيادة دولار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص دينار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_lyd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: lydAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `شراء دولار - كاش - نقص دينار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
            transactionDirection: 'debit',
          });
          
        } else if (input.operationType === "dollar_buy_bank") {
          // شراء دولار - مصرفي
          
          // 1. زيادة دولار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_usd',
            amountLYD: '0',
            amountUSD: input.dollarAmount.toFixed(2),
            amountUSDT: '0',
            description: `شراء دولار - مصرفي - زيادة دولار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص حساب بنكي دينار
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_expense',
              fromAccountType: 'treasury',
              fromAccountId: input.bankAccountId,
              toAccountType: null,
              toAccountId: null,
              amountLYD: lydAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `شراء دولار - مصرفي - نقص حساب بنكي (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
          
        } else if (input.operationType === "dollar_sell_cash") {
          // بيع دولار - كاش
          
          // 1. نقص دولار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_usd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: '0',
            amountUSD: input.dollarAmount.toFixed(2),
            amountUSDT: '0',
            transactionDirection: 'debit',
            description: `بيع دولار - كاش - نقص دولار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. زيادة دينار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: lydAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            transactionDirection: 'credit',
            description: `بيع دولار - كاش - زيادة دينار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
        } else if (input.operationType === "dollar_sell_bank") {
          // بيع دولار - مصرفي
          
          // 1. نقص دولار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_usd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: '0',
            amountUSD: input.dollarAmount.toFixed(2),
            amountUSDT: '0',
            description: `بيع دولار - مصرفي - نقص دولار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. زيادة حساب بنكي دينار
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_revenue',
              fromAccountType: null,
              fromAccountId: null,
              toAccountType: 'treasury',
              toAccountId: input.bankAccountId,
              amountLYD: lydAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `بيع دولار - مصرفي - زيادة حساب بنكي (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
        }
        
        // تسجيل الربح/الخسارة
        if (input.profit && input.profit !== 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: input.profit > 0 ? 'operation_revenue' : 'operation_expense',
            fromAccountType: input.profit > 0 ? null : 'treasury',
            fromAccountId: input.profit > 0 ? null : 'profits',
            toAccountType: input.profit > 0 ? 'treasury' : null,
            toAccountId: input.profit > 0 ? 'profits' : null,
            amountLYD: Math.abs(input.profit).toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `${input.profit > 0 ? 'ربح' : 'خسارة'} عملية ${input.operationType === "dollar_buy_cash" ? "شراء دولار - كاش" : input.operationType === "dollar_buy_bank" ? "شراء دولار - مصرفي" : input.operationType === "dollar_sell_cash" ? "بيع دولار - كاش" : "بيع دولار - مصرفي"} (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
            transactionDirection: input.profit > 0 ? 'credit' : 'debit',
          });
        }
      }

      // ربط بالخزينة - عمليات شراء/بيع USDT
      if (
        (input.operationType === "usdt_buy_cash" || 
         input.operationType === "usdt_buy_bank" ||
         input.operationType === "usdt_sell_cash" ||
         input.operationType === "usdt_sell_bank") &&
        input.usdtAmount && input.referencePrice
      ) {
        const now = new Date();
        const lydAmount = input.usdtAmount * input.referencePrice;
        
        if (input.operationType === "usdt_buy_cash") {
          // شراء USDT - كاش
          
          // 1. زيادة USDT
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'usdt',
            amountLYD: '0',
            amountUSD: '0',
            amountUSDT: input.usdtAmount.toFixed(2),
            description: `شراء USDT - كاش - زيادة USDT (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص دينار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'cash_lyd',
            toAccountType: null,
            toAccountId: null,
            amountLYD: lydAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `شراء USDT - كاش - نقص دينار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
        } else if (input.operationType === "usdt_buy_bank") {
          // شراء USDT - مصرفي
          
          // 1. زيادة USDT
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'usdt',
            amountLYD: '0',
            amountUSD: '0',
            amountUSDT: input.usdtAmount.toFixed(2),
            description: `شراء USDT - مصرفي - زيادة USDT (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. نقص حساب بنكي دينار
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_expense',
              fromAccountType: 'treasury',
              fromAccountId: input.bankAccountId,
              toAccountType: null,
              toAccountId: null,
              amountLYD: lydAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `شراء USDT - مصرفي - نقص حساب بنكي (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
          
        } else if (input.operationType === "usdt_sell_cash") {
          // بيع USDT - كاش
          
          // 1. نقص USDT
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'usdt',
            toAccountType: null,
            toAccountId: null,
            amountLYD: '0',
            amountUSD: '0',
            amountUSDT: input.usdtAmount.toFixed(2),
            description: `بيع USDT - كاش - نقص USDT (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. زيادة دينار كاش
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: lydAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `بيع USDT - كاش - زيادة دينار (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
        } else if (input.operationType === "usdt_sell_bank") {
          // بيع USDT - مصرفي
          
          // 1. نقص USDT
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_expense',
            fromAccountType: 'treasury',
            fromAccountId: 'usdt',
            toAccountType: null,
            toAccountId: null,
            amountLYD: '0',
            amountUSD: '0',
            amountUSDT: input.usdtAmount.toFixed(2),
            description: `بيع USDT - مصرفي - نقص USDT (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
          
          // 2. زيادة حساب بنكي دينار
          if (input.bankAccountId) {
            await db.insert(accountTransactions).values({
              id: nanoid(),
              transactionType: 'operation_revenue',
              fromAccountType: null,
              fromAccountId: null,
              toAccountType: 'treasury',
              toAccountId: input.bankAccountId,
              amountLYD: lydAmount.toFixed(2),
              amountUSD: '0',
              amountUSDT: '0',
              description: `بيع USDT - مصرفي - زيادة حساب بنكي (${input.customerName || 'غير محدد'})`,
              relatedEntityType: 'operation',
              relatedEntityId: operationId,
              processedBy: 'system',
              processedByName: 'النظام',
              timestamp: now,
            });
          }
        }
        
        // تسجيل الربح
        if (input.profit && input.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: input.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح عملية ${input.operationType === "usdt_buy_cash" ? "شراء USDT - كاش" : input.operationType === "usdt_buy_bank" ? "شراء USDT - مصرفي" : input.operationType === "usdt_sell_cash" ? "بيع USDT - كاش" : "بيع USDT - مصرفي"} (${input.customerName || 'غير محدد'})`,
            relatedEntityType: 'operation',
            relatedEntityId: operationId,
            processedBy: 'system',
            processedByName: 'النظام',
            timestamp: now,
          });
        }
      }

      // ربط بالخزينة - عملية سحب بطاقة الدولار
      if (input.operationType === "dollar_card_withdrawal" && input.profit && input.profit > 0) {
        const now = new Date();
        
        // تسجيل الربح فقط (لا تغيير في الحسابات)
        await db.insert(accountTransactions).values({
          id: nanoid(),
          transactionType: 'operation_revenue',
          fromAccountType: null,
          fromAccountId: null,
          toAccountType: 'treasury',
          toAccountId: 'profits',
          amountLYD: input.profit.toFixed(2),
          amountUSD: '0',
          amountUSDT: '0',
          description: `ربح عملية سحب بطاقة الدولار (${input.customerName || 'غير محدد'})`,
          relatedEntityType: 'operation',
          relatedEntityId: operationId,
          processedBy: 'system',
          processedByName: 'النظام',
          timestamp: now,
        });
      }

      // تحديث الخزينة مباشرة
      await updateTreasuryBalances(db, input, operationId, input.createdBy || 'system');

      // تسجيل في Audit Trail
      const opLabel = OPERATION_TYPE_LABELS[input.operationType] || input.operationType;
      const customerPart = input.customerName ? ` للزبون ${input.customerName}` : '';
      const profitPart = input.profit > 0 ? ` (ربح: ${input.profit.toLocaleString('ar-LY')} دينار)` : '';
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'operation',
        entityId: operationId,
        userId: input.createdBy,
        userName: input.createdByName,
        details: {
          description: `قام ${input.createdByName || 'مستخدم'} بتسجيل عملية ${opLabel}${customerPart}${profitPart}`,
          after: data,
          metadata: {
            operationType: input.operationType,
            customerName: input.customerName,
            profit: input.profit,
          },
        },
      });

      return { success: true, id: operationId };
    }),

  // Delete operation
  delete: publicProcedure
    .input(z.object({ 
      id: z.string(),
      deletedBy: z.string(),
      deletedByName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // قراءة العملية قبل الحذف
      const [operation] = await db.select().from(dailyOperations).where(eq(dailyOperations.id, input.id));

      await db.delete(dailyOperations).where(eq(dailyOperations.id, input.id));

      // تسجيل في Audit Trail
      if (operation) {
        const delOpLabel = OPERATION_TYPE_LABELS[operation.operationType] || operation.operationType;
        const delCustomerPart = operation.customerName ? ` للزبون ${operation.customerName}` : '';
        await db.insert(auditLogs).values({
          id: nanoid(),
          action: 'delete',
          entityType: 'operation',
          entityId: input.id,
          userId: input.deletedBy,
          userName: input.deletedByName,
          details: {
            description: `قام ${input.deletedByName} بحذف عملية ${delOpLabel}${delCustomerPart}`,
            before: operation,
            metadata: {
              operationType: operation.operationType,
              customerName: operation.customerName,
            },
          },
        });
      }

      return { success: true };
    }),
});
