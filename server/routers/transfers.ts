import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '../db';
import { transfers, transferStatusLogs, transferReceipts, branches, partnerCompanies } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { TRPCError } from '@trpc/server';
import { generateTransferNumber, generatePickupCode } from '../utils/transferUtils';
import { sendWhatsAppReceipt } from '../services/whatsapp';

// إدخال إنشاء حوالة
const createTransferSchema = z.object({
  branchFromId: z.string().optional(),
  branchToId: z.string().optional(),
  partnerCompanyId: z.string().optional(),
  transferType: z.enum(['internal', 'partner']),
  senderName: z.string().min(1),
  senderPhone: z.string().min(1),
  receiverName: z.string().min(1),
  receiverPhone: z.string().min(1),
  sendCurrency: z.enum(['LYD', 'USD', 'EUR', 'USDT']).default('LYD'),
  receiveCurrency: z.enum(['LYD', 'USD', 'EUR', 'USDT']).default('LYD'),
  sendAmount: z.number().positive(),
  feeType: z.enum(['fixed', 'percentage']).default('fixed'),
  feeValue: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'bank', 'usdt']).default('cash'),
  payoutMethod: z.enum(['cash', 'bank', 'usdt']).default('cash'),
  sourceAccountId: z.string().optional(),
  destinationAccountId: z.string().optional(),
  notes: z.string().optional(),
});

export const transfersRouter = router({
  // إنشاء حوالة جديدة
  create: publicProcedure.input(createTransferSchema).mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id || 'system';
    const companyId = ctx.user?.companyId || 'default';

    // حساب العمولة والإجمالي المدفوع
    let totalFee = 0;
    if (input.feeType === 'fixed') {
      totalFee = input.feeValue;
    } else {
      totalFee = (input.sendAmount * input.feeValue) / 100;
    }
    const totalPaid = input.sendAmount + totalFee;

    // ربح الشركة (إذا كانت داخلية كل الربح للشركة، وإذا شريك يتم حساب النصف)
    let profitCompany = totalFee;
    let profitPartner = 0;
    if (input.transferType === 'partner' && input.partnerCompanyId) {
      const partner = await db.select().from(partnerCompanies).where(eq(partnerCompanies.id, input.partnerCompanyId)).limit(1);
      const share = partner[0]?.commissionShare ? parseFloat(partner[0].commissionShare) : 50;
      profitCompany = totalFee * (share / 100);
      profitPartner = totalFee - profitCompany;
    }

    const transferNumber = await generateTransferNumber();
    const pickupCode = generatePickupCode();

    const [transfer] = await db.insert(transfers).values({
      id: nanoid(),
      transferNumber,
      companyId,
      branchFromId: input.branchFromId,
      branchToId: input.branchToId,
      partnerCompanyId: input.partnerCompanyId,
      transferType: input.transferType,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      receiverName: input.receiverName,
      receiverPhone: input.receiverPhone,
      sendCurrency: input.sendCurrency,
      receiveCurrency: input.receiveCurrency,
      sendAmount: input.sendAmount.toString(),
      totalFee: totalFee.toString(),
      totalPaid: totalPaid.toString(),
      profitCompany: profitCompany.toString(),
      profitPartner: profitPartner.toString(),
      paymentMethod: input.paymentMethod,
      payoutMethod: input.payoutMethod,
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
      status: 'created',
      pickupCode,
      createdBy: userId,
      notes: input.notes,
      createdAt: new Date(),
    }).returning();

    // تسجيل الحدث في الـ timeline
    await db.insert(transferStatusLogs).values({
      id: nanoid(),
      transferId: transfer.id,
      newStatus: 'created',
      action: 'create',
      employeeId: userId,
      createdAt: new Date(),
    });

    // تأثير على الخزينة: استلام القيمة من المرسل
    await ctx.trpc.treasury.distribute.mutate({
      fromAccountId: 'capital_distribution',
      toAccountId: `cash_${input.paymentMethod === 'cash' ? 'lyd' : 'bank'}`,
      toAccountType: input.paymentMethod === 'cash' ? 'cash_lyd' : 'bank_account',
      amount: totalPaid,
      currency: input.sendCurrency,
      description: `استلام حوالة رقم ${transfer.transferNumber} من ${input.senderName}`,
      bankAccountId: input.paymentMethod === 'bank' ? input.sourceAccountId : undefined,
    });

    // تسجيل التزام الصرف
    await ctx.trpc.treasury.distribute.mutate({
      fromAccountId: 'capital_distribution',
      toAccountId: 'transfer_liability',
      toAccountType: 'cash_lyd', // مؤقت، يمكن إنشاء حساب خاص بالتزامات الحوالات
      amount: input.sendAmount,
      currency: input.sendCurrency,
      description: `تسجيل التزام صرف حوالة ${transfer.transferNumber}`,
    });

    // إرسال الإيصال للمرسل عبر WhatsApp إذا تم تفعيله
    if (process.env.ENABLE_WHATSAPP === 'true') {
      await sendWhatsAppReceipt(transfer.id, 'sender');
    }

    return transfer;
  }),

  // تحديث حالة الحوالة (مع تسجيل السبب)
  updateStatus: publicProcedure.input(z.object({
    transferId: z.string(),
    newStatus: z.enum([
      'received', 'fee_calculated', 'profit_recorded', 'receipt_sent',
      'pending_approval', 'approved', 'rejected', 'sent_to_branch',
      'sent_to_partner', 'acknowledged_by_receiver', 'ready_for_payout',
      'receiver_arrived', 'identity_verified', 'pending_payout',
      'paid_full', 'paid_partial', 'failed_payout', 'cancelled',
      'refunded_to_sender', 'under_settlement', 'settled'
    ]),
    note: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })).mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id || 'system';
    const transfer = await db.select().from(transfers).where(eq(transfers.id, input.transferId)).limit(1);
    if (!transfer.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'الحوالة غير موجودة' });

    const oldStatus = transfer[0].status;
    await db.update(transfers).set({
      status: input.newStatus,
      ...(input.newStatus === 'paid_full' ? { paidAt: new Date(), paidBy: userId } : {}),
      ...(input.newStatus === 'cancelled' ? { cancelledAt: new Date(), cancelledBy: userId } : {}),
    }).where(eq(transfers.id, input.transferId));

    // تسجيل التايم لاين
    await db.insert(transferStatusLogs).values({
      id: nanoid(),
      transferId: input.transferId,
      oldStatus,
      newStatus: input.newStatus,
      action: 'status_change',
      note: input.note,
      employeeId: userId,
      metadata: input.metadata,
      createdAt: new Date(),
    });

    // عند صرف الحوالة (paid_full) نقوم بتحديث الخزينة: نقص من رصيد فرع الصرف
    if (input.newStatus === 'paid_full') {
      // تحديد حساب الصرف ( cash_lyd أو حساب بنكي)
      const payoutAccount = transfer[0].payoutMethod === 'cash' ? 'cash_lyd' : 'bank_account';
      await ctx.trpc.treasury.distribute.mutate({
        fromAccountId: 'capital_distribution',
        toAccountId: payoutAccount,
        toAccountType: transfer[0].payoutMethod === 'cash' ? 'cash_lyd' : 'bank_account',
        amount: -parseFloat(transfer[0].sendAmount), // سالب للخصم
        currency: transfer[0].sendCurrency,
        description: `صرف حوالة رقم ${transfer[0].transferNumber} للمستلم ${transfer[0].receiverName}`,
      });
      // إغلاق الالتزام
      await ctx.trpc.treasury.distribute.mutate({
        fromAccountId: 'capital_distribution',
        toAccountId: 'transfer_liability',
        toAccountType: 'cash_lyd',
        amount: -parseFloat(transfer[0].sendAmount),
        currency: transfer[0].sendCurrency,
        description: `إقفال التزام حوالة ${transfer[0].transferNumber}`,
      });
    }

    return { success: true };
  }),

  // الحصول على حوالة مع التفاصيل والتايم لاين
  getById: publicProcedure.input(z.string()).query(async ({ input }) => {
    const transfer = await db.select().from(transfers).where(eq(transfers.id, input)).limit(1);
    if (!transfer.length) throw new TRPCError({ code: 'NOT_FOUND' });
    const timeline = await db.select().from(transferStatusLogs).where(eq(transferStatusLogs.transferId, input)).orderBy(desc(transferStatusLogs.createdAt));
    const receipts = await db.select().from(transferReceipts).where(eq(transferReceipts.transferId, input));
    return { transfer: transfer[0], timeline, receipts };
  }),

  // قائمة الحوالات مع فلترة
  list: publicProcedure.input(z.object({
    limit: z.number().default(50),
    offset: z.number().default(0),
    status: z.string().optional(),
    fromDate: z.date().optional(),
    toDate: z.date().optional(),
    branchId: z.string().optional(),
  })).query(async ({ input }) => {
    let query = db.select().from(transfers);
    if (input.status) query = query.where(eq(transfers.status, input.status as any));
    if (input.branchId) query = query.where(eq(transfers.branchFromId, input.branchId));
    if (input.fromDate) query = query.where(sql`${transfers.createdAt} >= ${input.fromDate}`);
    if (input.toDate) query = query.where(sql`${transfers.createdAt} <= ${input.toDate}`);
    const items = await query.limit(input.limit).offset(input.offset).orderBy(desc(transfers.createdAt));
    const total = await db.select({ count: sql<number>`count(*)` }).from(transfers);
    return { items, total: total[0]?.count || 0 };
  }),
});