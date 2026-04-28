import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cards, treasuryAccounts, accountTransactions, auditLogs, treasuryRecords, type InsertCard } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastSync } from "../sync";
import { buildCardLog } from "../logMessages";

export const cardsRouter = router({
  // Get all cards (exclude soft-deleted)
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(cards).where(eq(cards.isDeleted, false));
  }),

  // Get deleted cards
  getDeleted: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db.select().from(cards).where(eq(cards.isDeleted, true));
  }),

  // Get card by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(cards).where(eq(cards.transactionId, input.id)).limit(1);
      return result[0] || null;
    }),

  // Create card
  create: publicProcedure
    .input(z.any()) // استخدام any لتبسيط الكود - سنضيف التحقق لاحقاً
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // تحويل الأرقام إلى strings لـ decimal
      const insertData: any = {
        ...input,
        purchasePrice: input.purchasePrice?.toString() || "0",
        delegateShare: input.delegateShare?.toString() || "0",
        totalPurchasePrice: input.totalPurchasePrice?.toString() || "0",
        depositAmount: input.depositAmount?.toString() || "0",
        currencyReserveAmount: input.currencyReserveAmount?.toString() || "0",
        bankDollarCost: input.bankDollarCost?.toString() || "0",
        cardDollarValue: input.cardDollarValue?.toString() || "0",
        firstWithdrawalRate: input.firstWithdrawalRate?.toString() || "0",
        firstNetAmount: input.firstNetAmount?.toString() || "0",
        remainingInCard: input.remainingInCard?.toString() || "0",
        sellDollarPrice: input.sellDollarPrice?.toString() || "0",
        firstDinarValue: input.firstDinarValue?.toString() || "0",
        firstProfit: input.firstProfit?.toString() || "0",
        secondWithdrawalRate: input.secondWithdrawalRate?.toString() || "0",
        secondNetAmount: input.secondNetAmount?.toString() || "0",
        secondSellDollarPrice: input.secondSellDollarPrice?.toString() || "0",
        secondDinarValue: input.secondDinarValue?.toString() || "0",
        secondProfit: input.secondProfit?.toString() || "0",
        totalProfit: input.totalProfit?.toString() || "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.insert(cards).values(insertData);

      // ربط مع حساب الخزينة (خصم تكلفة الشراء)
      if (input.treasuryAccountId && input.totalPurchasePrice) {
        const [treasuryAccount] = await db
          .select()
          .from(treasuryAccounts)
          .where(eq(treasuryAccounts.id, input.treasuryAccountId));

        if (treasuryAccount) {
          const purchaseCost = parseFloat(input.totalPurchasePrice?.toString() || "0");

          // خصم من الرصيد (افتراض LYD)
          const newBalance = (parseFloat(treasuryAccount.balanceLYD) - purchaseCost).toFixed(2);

          await db
            .update(treasuryAccounts)
            .set({ balanceLYD: newBalance })
            .where(eq(treasuryAccounts.id, input.treasuryAccountId));

          // تسجيل المعاملة
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: "operation_expense",
            fromAccountType: "treasury",
            fromAccountId: input.treasuryAccountId,
            toAccountType: null,
            toAccountId: null,
            amountLYD: purchaseCost.toFixed(2),
            amountUSD: "0",
            amountUSDT: "0",
            description: `شراء بطاقة - ${input.name}`,
            relatedEntityType: "card",
            relatedEntityId: input.transactionId,
            processedBy: input.createdBy,
            processedByName: input.createdBy,
          });
          
          // تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'withdrawal',
            amount: purchaseCost.toFixed(2),
            currency: 'LYD',
            description: `شراء بطاقة - ${input.name}`,
            reference: `CARD-${input.transactionId}`,
            processedBy: input.createdBy,
            data: { cardId: input.transactionId, treasuryAccountId: input.treasuryAccountId },
          });
        }
      }

      // إرسال حدث المزامنة
      broadcastSync({
        type: 'card_created',
        entityId: input.transactionId,
        entityType: 'card',
        data: { name: input.name, cardNumber: input.cardNumber },
        timestamp: Date.now(),
        triggeredBy: input.createdBy,
      });

      return { success: true };
    }),

  // Update card
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      updates: z.any(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // تحويل الأرقام إلى strings
      const updateData: any = { ...input.updates, updatedAt: new Date() };
      
      // تحويل جميع الحقول الرقمية
      const numericFields = [
        'purchasePrice', 'delegateShare', 'totalPurchasePrice',
        'depositAmount', 'currencyReserveAmount', 'bankDollarCost',
        'cardDollarValue', 'firstWithdrawalRate', 'firstNetAmount',
        'remainingInCard', 'sellDollarPrice', 'firstDinarValue',
        'firstProfit', 'secondWithdrawalRate', 'secondNetAmount',
        'secondSellDollarPrice', 'secondDinarValue', 'secondProfit',
        'totalProfit'
      ];
      
      numericFields.forEach(field => {
        if (updateData[field] !== undefined && typeof updateData[field] === 'number') {
          updateData[field] = updateData[field].toString();
        }
      });
      
      // الحصول على البطاقة القديمة للتحقق من تغيير الحالة
      const [oldCard] = await db.select().from(cards).where(eq(cards.transactionId, input.id)).limit(1);
      
      await db.update(cards).set(updateData).where(eq(cards.transactionId, input.id));
      
      // ربط مع الخزينة عند تغيير الحالة إلى "تم الإيداع"
      if (oldCard && updateData.financialStatus === 'تم الإيداع' && oldCard.financialStatus !== 'تم الإيداع') {
        const depositAmount = parseFloat(updateData.depositAmount || oldCard.depositAmount || '0');
        const paymentMethod = updateData.paymentMethod || oldCard.paymentMethod || 'cash';
        const treasuryAccountId = updateData.treasuryAccountId || oldCard.treasuryAccountId || 'cash_lyd';
        
        if (depositAmount > 0) {
          const accountId = paymentMethod === 'cash' ? 'cash_lyd' : treasuryAccountId;
          
          // 1. تحديث treasuryAccounts
          const [account] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, accountId)).limit(1);
          if (account) {
            const newBalance = (parseFloat(account.balanceLYD || '0') - depositAmount).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, accountId));
          }
          
          // 2. تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'withdrawal',
            amount: depositAmount.toFixed(2),
            currency: 'LYD',
            description: `إيداع بطاقة - ${oldCard.cardNumber} - ${paymentMethod === 'cash' ? 'كاش' : 'مصرفي'}`,
            reference: `CARD-DEPOSIT-${input.id}`,
            processedBy: updateData.updatedBy || 'system',
            data: { cardId: input.id, cardNumber: oldCard.cardNumber, paymentMethod, treasuryAccountId },
          });
        }
      }
      
      // إرسال حدث المزامنة (تغيير الحالة إذا تغيرت)
      if (oldCard && updateData.financialStatus && updateData.financialStatus !== oldCard.financialStatus) {
        broadcastSync({
          type: 'card_status_changed',
          entityId: input.id,
          entityType: 'card',
          data: {
            oldStatus: oldCard.financialStatus,
            newStatus: updateData.financialStatus,
          },
          timestamp: Date.now(),
          triggeredBy: updateData.updatedBy,
        });
      } else {
        broadcastSync({
          type: 'card_updated',
          entityId: input.id,
          entityType: 'card',
          timestamp: Date.now(),
          triggeredBy: updateData.updatedBy,
        });
      }

      return { success: true };
    }),

  // Delete card
  delete: publicProcedure
    .input(z.object({ id: z.string(), deletedBy: z.string().optional(), deletedByName: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // جلب البطاقة قبل الحذف لمعرفة المبالغ والمصادر
      const [card] = await db.select().from(cards).where(eq(cards.transactionId, input.id)).limit(1);
      if (!card) throw new Error("البطاقة غير موجودة");

      const deletedBy = input.deletedBy || 'unknown';
      const deletedByName = input.deletedByName || 'غير معروف';

      // ===== إرجاع قيمة الشراء الإجمالية =====
      const purchaseCost = parseFloat(card.totalPurchasePrice || '0');
      const purchaseAccountId = card.treasuryAccountId || 'cash_lyd';

      if (purchaseCost > 0 && purchaseAccountId) {
        const [purchaseAccount] = await db.select().from(treasuryAccounts)
          .where(eq(treasuryAccounts.id, purchaseAccountId)).limit(1);
        if (purchaseAccount) {
          const newBalance = (parseFloat(purchaseAccount.balanceLYD || '0') + purchaseCost).toFixed(2);
          await db.update(treasuryAccounts)
            .set({ balanceLYD: newBalance })
            .where(eq(treasuryAccounts.id, purchaseAccountId));

          // تسجيل معاملة الإرجاع
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'adjustment',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: purchaseAccountId,
            amountLYD: purchaseCost.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `إرجاع تكلفة شراء بطاقة محذوفة - ${card.name} (${card.cardNumber})`,
            relatedEntityType: 'card',
            relatedEntityId: input.id,
            processedBy: deletedBy,
            processedByName: deletedByName,
          });

          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: purchaseCost.toFixed(2),
            currency: 'LYD',
            description: `إرجاع تكلفة شراء بطاقة محذوفة - ${card.name} (${card.cardNumber})`,
            reference: `CARD-DELETE-PURCHASE-${input.id}`,
            processedBy: deletedBy,
            data: { cardId: input.id, cardNumber: card.cardNumber, reason: 'card_deleted', accountId: purchaseAccountId },
          });
        }
      }

      // ===== إرجاع مبلغ الإيداع إذا كانت الحالة "تم الإيداع" أو أبعد =====
      const depositStatuses = ['تم الإيداع', 'تم الحجز دون اختيار شركة الصرافة', 'تم اختيار شركة الصرافة', 'تمت المطابقة', 'في انتظار المطابقة', 'غير مطابق', 'تم التنفيذ'];
      const depositAmount = parseFloat(card.depositAmount || '0');

      if (depositAmount > 0 && depositStatuses.includes(card.financialStatus)) {
        const depositPaymentMethod = card.paymentMethod || 'cash';
        const depositAccountId = depositPaymentMethod === 'cash' ? 'cash_lyd' : (card.treasuryAccountId || 'cash_lyd');

        const [depositAccount] = await db.select().from(treasuryAccounts)
          .where(eq(treasuryAccounts.id, depositAccountId)).limit(1);
        if (depositAccount) {
          const newBalance = (parseFloat(depositAccount.balanceLYD || '0') + depositAmount).toFixed(2);
          await db.update(treasuryAccounts)
            .set({ balanceLYD: newBalance })
            .where(eq(treasuryAccounts.id, depositAccountId));

          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'adjustment',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: depositAccountId,
            amountLYD: depositAmount.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `إرجاع إيداع بطاقة محذوفة - ${card.name} (${card.cardNumber}) - ${depositPaymentMethod === 'cash' ? 'كاش' : 'مصرفي'}`,
            relatedEntityType: 'card',
            relatedEntityId: input.id,
            processedBy: deletedBy,
            processedByName: deletedByName,
          });

          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: depositAmount.toFixed(2),
            currency: 'LYD',
            description: `إرجاع إيداع بطاقة محذوفة - ${card.name} (${card.cardNumber}) - ${depositPaymentMethod === 'cash' ? 'كاش' : 'مصرفي'}`,
            reference: `CARD-DELETE-DEPOSIT-${input.id}`,
            processedBy: deletedBy,
            data: { cardId: input.id, cardNumber: card.cardNumber, reason: 'card_deleted', paymentMethod: depositPaymentMethod, accountId: depositAccountId },
          });
        }
      }

      // Soft delete - حذف ناعم
      await db.update(cards).set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy,
        deletedByName: deletedByName,
      }).where(eq(cards.transactionId, input.id));

      // تسجيل في auditLogs
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'delete',
        entityType: 'card',
        entityId: input.id,
        userId: deletedBy,
        userName: deletedByName,
        details: {
          description: `قام ${deletedByName} بحذف بطاقة ${card.name} (${card.cardNumber}) - تم إرجاع ${purchaseCost > 0 ? purchaseCost + ' د.ل تكلفة شراء' : ''} ${depositAmount > 0 && depositStatuses.includes(card.financialStatus) ? '+ ' + depositAmount + ' د.ل إيداع' : ''}`.trim(),
          metadata: {
            cardNumber: card.cardNumber,
            financialStatus: card.financialStatus,
            purchaseRefunded: purchaseCost,
            depositRefunded: depositAmount > 0 && depositStatuses.includes(card.financialStatus) ? depositAmount : 0,
          },
        },
      });

      // إرسال حدث المزامنة
      broadcastSync({
        type: 'card_deleted',
        entityId: input.id,
        entityType: 'card',
        timestamp: Date.now(),
      });

      return { 
        success: true,
        purchaseRefunded: purchaseCost,
        depositRefunded: depositAmount > 0 && depositStatuses.includes(card.financialStatus) ? depositAmount : 0,
      };
    }),

  // Bulk withdrawal - سحب جماعي مع بيع
  bulkWithdrawal: publicProcedure
    .input(
      z.object({
        cards: z.array(
          z.object({
            cardNumber: z.string(),
            customerId: z.string(),
            withdrawnAmount: z.number(), // المبلغ المسحوب
            receivedAmount: z.number(), // المبلغ المستلم بعد النسبة والمتبقي
            heldAmount: z.number(), // المتبقي المحتجز
            percentage: z.number(), // نسبة السحب
            machine: z.string(), // المكينة
            saleType: z.enum(['cash', 'bank']), // نوع البيع
            exchangeRate: z.number(), // سعر الصرف
            amountInLYD: z.number(), // المبلغ بالدينار
            profit: z.number(), // الربح
            depositBalance: z.number(), // رصيد الإيداع
            purchasePrice: z.number(), // ثمن الشراء
          })
        ),
        bankAccountId: z.string().optional(), // الحساب البنكي للبطاقات المصرفية
        createdBy: z.string(),
        createdByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      // معالجة كل بطاقة
      for (const card of input.cards) {
        // 1. زيادة رصيد الدينار حسب نوع البيع
        if (card.saleType === 'cash') {
          // بيع كاش: زيادة كاش دينار
          
          // تحديث treasuryAccounts
          const [cashAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, 'cash_lyd')).limit(1);
          if (cashAccount) {
            const newBalance = (parseFloat(cashAccount.balanceLYD || '0') + card.amountInLYD).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, 'cash_lyd'));
          }
          
          // تسجيل في accountTransactions
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: card.amountInLYD.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `بيع بطاقة كاش - ${card.cardNumber} - ${card.receivedAmount}$ × ${card.exchangeRate} = ${card.amountInLYD.toFixed(2)} د.ل`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          
          // تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: card.amountInLYD.toFixed(2),
            currency: 'LYD',
            description: `بيع بطاقة كاش - ${card.cardNumber}`,
            reference: `CARD-SALE-${card.customerId}`,
            processedBy: input.createdBy,
            data: { cardNumber: card.cardNumber, customerId: card.customerId },
          });
        } else if (card.saleType === 'bank' && input.bankAccountId) {
          // بيع مصرفي: زيادة الحساب البنكي
          
          // تحديث treasuryAccounts
          const [bankAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, input.bankAccountId)).limit(1);
          if (bankAccount) {
            const newBalance = (parseFloat(bankAccount.balanceLYD || '0') + card.amountInLYD).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, input.bankAccountId));
          }
          
          // تسجيل في accountTransactions
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: input.bankAccountId,
            amountLYD: card.amountInLYD.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `بيع بطاقة مصرفي - ${card.cardNumber} - ${card.receivedAmount}$ × ${card.exchangeRate} = ${card.amountInLYD.toFixed(2)} د.ل`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          
          // تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: card.amountInLYD.toFixed(2),
            currency: 'LYD',
            description: `بيع بطاقة مصرفي - ${card.cardNumber}`,
            reference: `CARD-SALE-${card.customerId}`,
            processedBy: input.createdBy,
            data: { cardNumber: card.cardNumber, customerId: card.customerId, bankAccountId: input.bankAccountId },
          });
        }

        // 2. تسجيل الربح وتحديث رصيد حساب الأرباح
        if (card.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: card.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح بيع بطاقة ${card.cardNumber} - ${card.saleType === 'cash' ? 'كاش' : 'مصرفي'}`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          // تحديث رصيد حساب الأرباح في treasuryAccounts
          const [profitsAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, 'profits')).limit(1);
          if (profitsAccount) {
            const newProfitBalance = (parseFloat(profitsAccount.balanceLYD || '0') + card.profit).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newProfitBalance }).where(eq(treasuryAccounts.id, 'profits'));
          }
        }
      }

      // تسجيل في Audit Trail بنص عربي مقروء
      const totalAmountBulk = input.cards.reduce((sum, c) => sum + c.amountInLYD, 0);
      const totalProfitBulk = input.cards.reduce((sum, c) => sum + c.profit, 0);
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'card',
        entityId: null,
        userId: input.createdBy,
        userName: input.createdByName,
        details: {
          description: `قام ${input.createdByName} بسحب ${input.cards.length} بطاقة بإجمالي ${totalAmountBulk.toLocaleString('ar-LY')} دينار وربح ${totalProfitBulk.toLocaleString('ar-LY')} دينار`,
          after: {
            operation: 'bulk_withdrawal',
            cardsCount: input.cards.length,
            totalAmount: totalAmountBulk,
            totalProfit: totalProfitBulk,
          },
          metadata: {
            cards: input.cards.map(c => ({
              cardNumber: c.cardNumber,
              customerId: c.customerId,
              saleType: c.saleType,
              amountInLYD: c.amountInLYD,
              profit: c.profit,
            })),
          },
        },
      });
      return { success: true, message: `تم معالجة ${input.cards.length} بطاقة بنجاح` };
    }),

  // Withdraw held amount - سحب المتبقي المحتجز
  withdrawHeld: publicProcedure
    .input(
      z.object({
        cards: z.array(
          z.object({
            cardNumber: z.string(),
            customerId: z.string(),
            originalHeldAmount: z.number(), // المتبقي المحتجز الأصلي
            returnedAmount: z.number(), // القيمة الفعلية المرجعة
            receivedAmount: z.number(), // المبلغ المستلم بعد النسبة
            percentage: z.number(), // نسبة السحب
            saleType: z.enum(['cash', 'bank']), // نوع البيع
            exchangeRate: z.number(), // سعر الصرف
            amountInLYD: z.number(), // المبلغ بالدينار
            profit: z.number(), // الربح من المتبقي
          })
        ),
        bankAccountId: z.string().optional(), // الحساب البنكي للبطاقات المصرفية
        createdBy: z.string(),
        createdByName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      // معالجة كل بطاقة
      for (const card of input.cards) {
        // 1. زيادة رصيد الدينار حسب نوع البيع
        if (card.saleType === 'cash') {
          // بيع كاش: زيادة كاش دينار
          
          // تحديث treasuryAccounts
          const [cashAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, 'cash_lyd')).limit(1);
          if (cashAccount) {
            const newBalance = (parseFloat(cashAccount.balanceLYD || '0') + card.amountInLYD).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, 'cash_lyd'));
          }
          
          // تسجيل في accountTransactions
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'cash_lyd',
            amountLYD: card.amountInLYD.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `بيع متبقي كاش - ${card.cardNumber} - ${card.receivedAmount}$ × ${card.exchangeRate} = ${card.amountInLYD.toFixed(2)} د.ل`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          
          // تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: card.amountInLYD.toFixed(2),
            currency: 'LYD',
            description: `بيع متبقي كاش - ${card.cardNumber}`,
            reference: `CARD-REMAINING-${card.customerId}`,
            processedBy: input.createdBy,
            data: { cardNumber: card.cardNumber, customerId: card.customerId },
          });
        } else if (card.saleType === 'bank' && input.bankAccountId) {
          // بيع مصرفي: زيادة الحساب البنكي
          
          // تحديث treasuryAccounts
          const [bankAccount] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, input.bankAccountId)).limit(1);
          if (bankAccount) {
            const newBalance = (parseFloat(bankAccount.balanceLYD || '0') + card.amountInLYD).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newBalance }).where(eq(treasuryAccounts.id, input.bankAccountId));
          }
          
          // تسجيل في accountTransactions
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: input.bankAccountId,
            amountLYD: card.amountInLYD.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `بيع متبقي مصرفي - ${card.cardNumber} - ${card.receivedAmount}$ × ${card.exchangeRate} = ${card.amountInLYD.toFixed(2)} د.ل`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          
          // تسجيل في treasury_records
          await db.insert(treasuryRecords).values({
            id: nanoid(),
            type: 'deposit',
            amount: card.amountInLYD.toFixed(2),
            currency: 'LYD',
            description: `بيع متبقي مصرفي - ${card.cardNumber}`,
            reference: `CARD-REMAINING-${card.customerId}`,
            processedBy: input.createdBy,
            data: { cardNumber: card.cardNumber, customerId: card.customerId, bankAccountId: input.bankAccountId },
          });
        }

        // 2. تسجيل الربح من المتبقي وتحديث رصيد حساب الأرباح
        if (card.profit > 0) {
          await db.insert(accountTransactions).values({
            id: nanoid(),
            transactionType: 'operation_revenue',
            fromAccountType: null,
            fromAccountId: null,
            toAccountType: 'treasury',
            toAccountId: 'profits',
            amountLYD: card.profit.toFixed(2),
            amountUSD: '0',
            amountUSDT: '0',
            description: `ربح بيع متبقي بطاقة ${card.cardNumber} - ${card.saleType === 'cash' ? 'كاش' : 'مصرفي'}`,
            relatedEntityType: 'card',
            relatedEntityId: card.customerId,
            processedBy: input.createdBy,
            processedByName: input.createdByName,
            timestamp: now,
          });
          // تحديث رصيد حساب الأرباح في treasuryAccounts
          const [profitsAccountHeld] = await db.select().from(treasuryAccounts).where(eq(treasuryAccounts.id, 'profits')).limit(1);
          if (profitsAccountHeld) {
            const newProfitBalanceHeld = (parseFloat(profitsAccountHeld.balanceLYD || '0') + card.profit).toFixed(2);
            await db.update(treasuryAccounts).set({ balanceLYD: newProfitBalanceHeld }).where(eq(treasuryAccounts.id, 'profits'));
          }
        }
      }

      // تسجيل في Audit Trail بنص عربي مقروء
      const totalAmountHeld = input.cards.reduce((sum, c) => sum + c.amountInLYD, 0);
      const totalProfitHeld = input.cards.reduce((sum, c) => sum + c.profit, 0);
      await db.insert(auditLogs).values({
        id: nanoid(),
        action: 'create',
        entityType: 'card',
        entityId: null,
        userId: input.createdBy,
        userName: input.createdByName,
        details: {
          description: `قام ${input.createdByName} بسحب المتبقي لـ ${input.cards.length} بطاقة بإجمالي ${totalAmountHeld.toLocaleString('ar-LY')} دينار وربح ${totalProfitHeld.toLocaleString('ar-LY')} دينار`,
          after: {
            cardsCount: input.cards.length,
            totalAmount: totalAmountHeld,
            totalProfit: totalProfitHeld,
          },
        },
      });

      return { success: true, message: `تم معالجة ${input.cards.length} متبقي بنجاح` };
    }),
});
