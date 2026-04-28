import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { trpc } from '../utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { formatDate, formatCurrency } from '../lib/utils';
import { Loader2 } from 'lucide-react';

export default function TransferDetails({ transferId }: { transferId: string }) {
  const { data, isLoading } = trpc.transfers.getById.useQuery(transferId);
  
  if (isLoading) return <div className="flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div>لم يتم العثور على الحوالة</div>;

  const { transfer, timeline, receipts } = data;

  const statusColors: Record<string, string> = {
    created: 'bg-gray-100',
    pending_approval: 'bg-yellow-100',
    ready_for_payout: 'bg-blue-100',
    paid_full: 'bg-green-100',
    cancelled: 'bg-red-100',
  };

  return (
    <div className="space-y-6">
      {/* معلومات أساسية */}
      <Card>
        <CardHeader><CardTitle>معلومات الحوالة</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><strong>رقم الحوالة:</strong> {transfer.transferNumber}</div>
          <div><strong>كود الاستلام:</strong> {transfer.pickupCode}</div>
          <div><strong>الحالة:</strong> <Badge className={statusColors[transfer.status]}>{transfer.status}</Badge></div>
          <div><strong>تاريخ الإنشاء:</strong> {formatDate(transfer.createdAt)}</div>
          <div><strong>المرسل:</strong> {transfer.senderName} ({transfer.senderPhone})</div>
          <div><strong>المستلم:</strong> {transfer.receiverName} ({transfer.receiverPhone})</div>
          <div><strong>القيمة:</strong> {transfer.sendAmount} {transfer.sendCurrency}</div>
          <div><strong>العمولة:</strong> {transfer.totalFee} {transfer.sendCurrency}</div>
          <div><strong>الإجمالي المدفوع:</strong> {transfer.totalPaid} {transfer.sendCurrency}</div>
          <div><strong>ربح الشركة:</strong> {transfer.profitCompany} {transfer.sendCurrency}</div>
          {transfer.profitPartner > 0 && <div><strong>ربح الشريك:</strong> {transfer.profitPartner} {transfer.sendCurrency}</div>}
          <div><strong>طريقة الدفع:</strong> {transfer.paymentMethod}</div>
          <div><strong>طريقة الصرف:</strong> {transfer.payoutMethod}</div>
        </CardContent>
      </Card>

      {/* Timeline التتبع */}
      <Card>
        <CardHeader><CardTitle>سجل التتبع (Timeline)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((log) => (
              <div key={log.id} className="border-r-2 border-primary pr-4 relative">
                <div className="absolute -right-[9px] top-0 w-4 h-4 rounded-full bg-primary"></div>
                <div className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</div>
                <div className="font-semibold">{log.newStatus}</div>
                {log.note && <div className="text-sm">ملاحظة: {log.note}</div>}
                <div className="text-xs text-gray-500">بواسطة: {log.employeeId}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* الإيصالات */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>الإيصالات الإلكترونية</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="flex justify-between items-center">
                  <span>{receipt.receiptType === 'sender' ? 'إيصال المرسل' : 'إيصال المستلم'}</span>
                  <span className="text-sm">أرسل إلى: {receipt.sentTo}</span>
                  <span className={`text-xs ${receipt.sentStatus === 'sent' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {receipt.sentStatus}
                  </span>
                  <a href={receipt.pdfUrl} target="_blank" className="text-blue-600 underline">تحميل PDF</a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}