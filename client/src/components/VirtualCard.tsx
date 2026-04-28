import { Card as BankCard } from '@/types/customers';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface VirtualCardProps {
  card: BankCard;
  holderName: string;
}

export function VirtualCard({ card, holderName }: VirtualCardProps) {
  const [showCVV, setShowCVV] = useState(false);

  const formatCardNumber = (cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (date: Date | string) => {
    if (typeof date === 'string') {
      return date;
    }
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${month}/${year}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* البطاقة الافتراضية */}
      <div className="relative h-64 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-6 text-white font-mono transform transition-transform hover:scale-105">
        {/* خلفية البطاقة */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 250">
            <circle cx="50" cy="50" r="80" fill="white" />
            <circle cx="350" cy="200" r="100" fill="white" />
          </svg>
        </div>

        {/* محتوى البطاقة */}
        <div className="relative h-full flex flex-col justify-between">
          {/* رأس البطاقة */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-75">AMAN BANK</p>
              <p className="text-lg font-bold">مصرف الأمان</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">MASTERCARD</p>
              <div className="flex gap-1 mt-1">
                <div className="w-6 h-4 rounded-full bg-red-400 opacity-80"></div>
                <div className="w-6 h-4 rounded-full bg-orange-400 opacity-80"></div>
              </div>
            </div>
          </div>

          {/* رقم البطاقة */}
          <div className="space-y-2">
            <p className="text-xs opacity-75">CARD NUMBER</p>
            <p className="text-2xl tracking-widest font-bold">
              {formatCardNumber(card.cardNumber || '0000 0000 0000 0000')}
            </p>
          </div>

          {/* البيانات السفلية */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs opacity-75">CARDHOLDER NAME</p>
              <p className="text-sm font-bold uppercase">{holderName || 'CUSTOMER NAME'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">VALID THRU</p>
              <p className="text-lg font-bold">{formatExpiryDate(card.expiryDate || new Date())}</p>
            </div>
          </div>
        </div>

        {/* شريط مغناطيسي */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-black opacity-40"></div>
      </div>

      {/* بيانات البطاقة الإضافية */}
      <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">الرمز السري (CVV):</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold text-slate-900">
              {showCVV ? card.cvv : '***'}
            </span>
            <button
              onClick={() => setShowCVV(!showCVV)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
              title={showCVV ? 'إخفاء' : 'عرض'}
            >
              {showCVV ? (
                <EyeOff className="w-4 h-4 text-slate-600" />
              ) : (
                <Eye className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">نوع البطاقة:</span>
          <span className="text-sm font-mono text-slate-900 uppercase">{card.cardType || 'Debit'}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">الرصيد:</span>
          <span className="text-sm font-mono text-slate-900 font-bold">
            {card.balance?.toFixed(2) || '0.00'} {card.currency || 'LYD'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">الحد اليومي:</span>
          <span className="text-sm font-mono text-slate-900">{card.dailyLimit?.toLocaleString() || '5000'} د.ل</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">الحد الشهري:</span>
          <span className="text-sm font-mono text-slate-900">{card.monthlyLimit?.toLocaleString() || '50000'} د.ل</span>
        </div>
      </div>

      {/* تحذير أمني */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg">
        <p className="text-xs text-amber-800 text-center">
          ⚠️ <strong>تنبيه أمني:</strong> لا تشارك بيانات البطاقة أو الرمز السري مع أي شخص
        </p>
      </div>
    </div>
  );
}
