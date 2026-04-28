import { db } from '../db';
import { transfers, transferReceipts } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { generatePDFReceipt } from './pdfGenerator';

export async function sendWhatsAppReceipt(transferId: string, type: 'sender' | 'receiver') {
  const transfer = await db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
  if (!transfer.length) return;

  const pdfBuffer = await generatePDFReceipt(transfer[0], type);
  // رفع الملف إلى S3 أو تخزينه مؤقتاً
  const pdfUrl = `https://storage.example.com/receipts/${transfer[0].transferNumber}_${type}.pdf`;

  // استدعاء API حقيقي مثل Twilio أو WATI
  const phone = type === 'sender' ? transfer[0].senderPhone : transfer[0].receiverPhone;
  // await axios.post('https://api.whatsapp.com/send', { to: phone, file: pdfUrl });

  // تسجيل الإيصال في قاعدة البيانات
  await db.insert(transferReceipts).values({
    id: nanoid(),
    transferId,
    receiptType: type === 'sender' ? 'sender' : 'receiver',
    pdfUrl,
    sentTo: phone,
    sentChannel: 'whatsapp',
    sentStatus: 'sent',
    createdAt: new Date(),
  });
}