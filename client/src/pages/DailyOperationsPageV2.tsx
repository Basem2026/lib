import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyBankAccounts } from '@/contexts/CompanyBankAccountsContext';
import { useAccounts } from '@/contexts/AccountsContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Printer, Trash2, Eye, FileDown } from 'lucide-react';


import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import PageHeader from '@/components/PageHeader';
import { BRAND_COLORS } from '@/lib/colors';
import { COMPANY_LOGO_BASE64 } from '@/assets/logo-base64';

/**
 * صفحة العمليات اليومية - نموذج ديناميكي كامل
 * يتغير حسب نوع العملية المختارة مع حسابات تلقائية
 */
export default function DailyOperationsPageV2() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const utils = trpc.useUtils();
  const { addTransaction } = useAccounts();
  const { sendPushToManagers } = useNotifications();
  const { employees } = useEmployees();
  const getManagerIds = () =>
    employees
      .filter(e => (e.jobTitle === 'manager' || e.jobTitle === 'deputy_manager') && e.status === 'active')
      .map(e => e.id);
  
  // جلب البيانات
  const { data: operations = [] } = trpc.operations.getAll.useQuery();
  const { accounts: bankAccounts } = useCompanyBankAccounts();
  
  // Mutations
  const createOperation = trpc.operations.create.useMutation({
    onSuccess: (result, variables) => {
      // تسجيل في localStorage لتحديث الأرصدة فوراً
      const now = new Date();
      
      // سحب بطاقة
      if (variables.operationType === 'card_withdrawal' && variables.customerTransferAmount && variables.deliveredToCustomer) {
        // 1. زيادة الحساب البنكي (الزبون يحول في حسابك)
        if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
          addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: variables.customerTransferAmount,
            currency: 'LYD',
            description: `سحب بطاقة - استلام من الزبون`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
        
        // 2. نقص كاش دينار (أنت تعطي الزبون كاش)
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_lyd',
          amount: variables.deliveredToCustomer,
          currency: 'LYD',
          description: `سحب بطاقة - تسليم للزبون`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        
        // 3. زيادة الأرباح
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح سحب بطاقة`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // تحويلات/إيداعات
      else if (variables.operationType === 'transfer_deposit' && variables.transferType && variables.customerPaidAmount && variables.deliveredToCustomerTransfer) {
        if (variables.transferType === 'account_to_cash') {
          // من الحساب إلى كاش
          if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
            addTransaction({
              type: 'deposit',
              accountType: 'bank_lyd',
              amount: variables.customerPaidAmount,
              currency: 'LYD',
              description: `تحويل - استلام في الحساب`,
              reference: `OP-${result.id}`,
              date: now,
              createdBy: user?.id?.toString() || 'system',
            });
          }
          addTransaction({
            type: 'withdrawal',
            accountType: 'cash_lyd',
            amount: variables.deliveredToCustomerTransfer,
            currency: 'LYD',
            description: `تحويل - تسليم كاش`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        } else {
          // من كاش إلى الحساب
          addTransaction({
            type: 'deposit',
            accountType: 'cash_lyd',
            amount: variables.customerPaidAmount,
            currency: 'LYD',
            description: `تحويل - استلام كاش`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
          if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
            addTransaction({
              type: 'withdrawal',
              accountType: 'bank_lyd',
              amount: variables.deliveredToCustomerTransfer,
              currency: 'LYD',
              description: `تحويل - تحويل للحساب`,
              reference: `OP-${result.id}`,
              date: now,
              createdBy: user?.id?.toString() || 'system',
            });
          }
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح تحويل`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // صيرفة الأمان
      else if (variables.operationType === 'aman_exchange' && variables.transferType && variables.customerPaidAmount && variables.deliveredToCustomerTransfer) {
        if (variables.transferType === 'account_to_cash') {
          if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
            addTransaction({
              type: 'deposit',
              accountType: 'bank_lyd',
              amount: variables.customerPaidAmount,
              currency: 'LYD',
              description: `صيرفة الأمان - استلام في الحساب`,
              reference: `OP-${result.id}`,
              date: now,
              createdBy: user?.id?.toString() || 'system',
            });
          }
          addTransaction({
            type: 'withdrawal',
            accountType: 'cash_lyd',
            amount: variables.deliveredToCustomerTransfer,
            currency: 'LYD',
            description: `صيرفة الأمان - تسليم كاش`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        } else {
          addTransaction({
            type: 'deposit',
            accountType: 'cash_lyd',
            amount: variables.customerPaidAmount,
            currency: 'LYD',
            description: `صيرفة الأمان - استلام كاش`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
          if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
            addTransaction({
              type: 'withdrawal',
              accountType: 'bank_lyd',
              amount: variables.deliveredToCustomerTransfer,
              currency: 'LYD',
              description: `صيرفة الأمان - تحويل للحساب`,
              reference: `OP-${result.id}`,
              date: now,
              createdBy: user?.id?.toString() || 'system',
            });
          }
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح صيرفة الأمان`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // شراء دولار - كاش
      else if (variables.operationType === 'dollar_buy_cash' && variables.dollarAmount && variables.buyPrice) {
        addTransaction({
          type: 'deposit',
          accountType: 'cash_usd',
          amount: variables.dollarAmount,
          currency: 'USD',
          description: `شراء دولار - كاش`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_lyd',
          amount: variables.dollarAmount * variables.buyPrice,
          currency: 'LYD',
          description: `شراء دولار - دفع دينار`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح شراء دولار`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // شراء دولار - بنكي
      else if (variables.operationType === 'dollar_buy_bank' && variables.dollarAmount && variables.buyPrice) {
        addTransaction({
          type: 'deposit',
          accountType: 'cash_usd',
          amount: variables.dollarAmount,
          currency: 'USD',
          description: `شراء دولار - بنكي`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
          addTransaction({
            type: 'withdrawal',
            accountType: 'bank_lyd',
            amount: variables.dollarAmount * variables.buyPrice,
            currency: 'LYD',
            description: `شراء دولار - تحويل بنكي`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح شراء دولار`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // بيع دولار - كاش
      else if (variables.operationType === 'dollar_sell_cash' && variables.dollarAmount && variables.sellPrice) {
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_usd',
          amount: variables.dollarAmount,
          currency: 'USD',
          description: `بيع دولار - كاش`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        addTransaction({
          type: 'deposit',
          accountType: 'cash_lyd',
          amount: variables.dinarReceivedFromCustomer || (variables.dollarAmount * variables.sellPrice),
          currency: 'LYD',
          description: `بيع دولار - استلام دينار`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح بيع دولار`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // بيع دولار - بنكي
      else if (variables.operationType === 'dollar_sell_bank' && variables.dollarAmount && variables.sellPrice) {
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_usd',
          amount: variables.dollarAmount,
          currency: 'USD',
          description: `بيع دولار - بنكي`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
          addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: variables.dollarAmount * variables.sellPrice,
            currency: 'LYD',
            description: `بيع دولار - استلام بنكي`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح بيع دولار`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // شراء USDT - كاش
      else if (variables.operationType === 'usdt_buy_cash' && variables.usdtAmount && variables.totalAmount) {
        addTransaction({
          type: 'deposit',
          accountType: 'usdt',
          amount: variables.usdtAmount,
          currency: 'USDT',
          description: `شراء USDT - كاش`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_lyd',
          amount: variables.totalAmount,
          currency: 'LYD',
          description: `شراء USDT - دفع دينار`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح شراء USDT`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // شراء USDT - بنكي
      else if (variables.operationType === 'usdt_buy_bank' && variables.usdtAmount && variables.totalAmount) {
        addTransaction({
          type: 'deposit',
          accountType: 'usdt',
          amount: variables.usdtAmount,
          currency: 'USDT',
          description: `شراء USDT - بنكي`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
          addTransaction({
            type: 'withdrawal',
            accountType: 'bank_lyd',
            amount: variables.totalAmount,
            currency: 'LYD',
            description: `شراء USDT - تحويل بنكي`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح شراء USDT`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // بيع USDT - كاش
      else if (variables.operationType === 'usdt_sell_cash' && variables.usdtAmount && variables.totalAmount) {
        addTransaction({
          type: 'withdrawal',
          accountType: 'usdt',
          amount: variables.usdtAmount,
          currency: 'USDT',
          description: `بيع USDT - كاش`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        addTransaction({
          type: 'deposit',
          accountType: 'cash_lyd',
          amount: variables.totalAmount,
          currency: 'LYD',
          description: `بيع USDT - استلام دينار`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح بيع USDT`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // بيع USDT - بنكي
      else if (variables.operationType === 'usdt_sell_bank' && variables.usdtAmount && variables.totalAmount) {
        addTransaction({
          type: 'withdrawal',
          accountType: 'usdt',
          amount: variables.usdtAmount,
          currency: 'USDT',
          description: `بيع USDT - بنكي`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.paymentMethod === 'bank' && variables.bankAccountId) {
          addTransaction({
            type: 'deposit',
            accountType: 'bank_lyd',
            amount: variables.totalAmount,
            currency: 'LYD',
            description: `بيع USDT - استلام بنكي`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح بيع USDT`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      // سحب بطاقات الدولار
      else if (variables.operationType === 'dollar_card_withdrawal' && variables.withdrawnDollar) {
        addTransaction({
          type: 'withdrawal',
          accountType: 'cash_usd',
          amount: variables.withdrawnDollar,
          currency: 'USD',
          description: `سحب بطاقة دولار`,
          reference: `OP-${result.id}`,
          date: now,
          createdBy: user?.id?.toString() || 'system',
        });
        if (variables.profit > 0) {
          addTransaction({
            type: 'deposit',
            accountType: 'profits',
            amount: variables.profit,
            currency: 'LYD',
            description: `ربح سحب بطاقة دولار`,
            reference: `OP-${result.id}`,
            date: now,
            createdBy: user?.id?.toString() || 'system',
          });
        }
      }
      
      toast.success('تمت إضافة العملية بنجاح');
      utils.operations.getAll.invalidate();
      setShowAddDialog(false);
      resetForm();
      // إرسال Web Push للمدير ونائبه
      const opLabels: Record<string, string> = {
        'card_withdrawal': 'سحب بطاقة',
        'transfer_deposit': 'تحويل/إيداع',
        'aman_exchange': 'صيرفة الأمان',
        'dollar_buy_cash': 'شراء دولار كاش',
        'dollar_buy_bank': 'شراء دولار مصرفي',
        'dollar_sell_cash': 'بيع دولار كاش',
        'dollar_sell_bank': 'بيع دولار مصرفي',
        'dollar_card_withdrawal': 'سحب بطاقات الدولار',
      };
      const opLabel = opLabels[variables.operationType] || variables.operationType;
      sendPushToManagers(
        '💰 عملية يومية جديدة',
        `الموظف: ${user?.fullName || 'admin'} | نوع: ${opLabel}${variables.customerName ? ' | الزبون: ' + variables.customerName : ''}${variables.notes ? ' | ملاحظة: ' + variables.notes : ''}`,
        getManagerIds(),
        '/daily-operations'
      );
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  const deleteOperation = trpc.operations.delete.useMutation({
    onSuccess: (_result, variables) => {
      toast.success('تم حذف العملية بنجاح');
      utils.operations.getAll.invalidate();
      // إرسال Web Push للمدير ونائبه
      sendPushToManagers(
        '⚠️ حذف عملية يومية',
        `الموظف: ${user?.fullName || 'admin'} | رقم العملية: ${variables.id}`,
        getManagerIds(),
        '/daily-operations'
      );
    },
    onError: (error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });
  
  // States - عامة
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [bankAccountId, setBankAccountId] = useState('');
  const [notes, setNotes] = useState('');
  
  // States - سحب بطاقة
  const [deliveredToCustomer, setDeliveredToCustomer] = useState('');
  const [customerTransferAmount, setCustomerTransferAmount] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  
  // States - تحويلات/إيداعات
  const [transferType, setTransferType] = useState<'account_to_cash' | 'cash_to_account'>('account_to_cash');
  const [customerPaidAmount, setCustomerPaidAmount] = useState('');
  const [transferPercentage, setTransferPercentage] = useState('');
  const [percentageType, setPercentageType] = useState<'increase' | 'discount'>('discount');
  const [deliveredToCustomerTransfer, setDeliveredToCustomerTransfer] = useState('');
  
  // States - شراء/بيع دولار
  const [dollarAmount, setDollarAmount] = useState('');
  const [dinarDeliveredToCustomer, setDinarDeliveredToCustomer] = useState('');
  const [dinarReceivedFromCustomer, setDinarReceivedFromCustomer] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [referencePrice, setReferencePrice] = useState('');
  
  // States - USDT
  const [usdtAmount, setUsdtAmount] = useState('');
  const [usdtCommissionPercentage, setUsdtCommissionPercentage] = useState('');
  const [networkFee, setNetworkFee] = useState('');
  const [amountToOurAccount, setAmountToOurAccount] = useState('');
  const [dinarPaidToCustomer, setDinarPaidToCustomer] = useState('');
  const [dollarPaidToCustomer, setDollarPaidToCustomer] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  
  // States - سحب بطاقات الدولار
  const [withdrawnDollar, setWithdrawnDollar] = useState('');
  const [machinePercentage, setMachinePercentage] = useState('');
  const [companyPercentage, setCompanyPercentage] = useState('');
  const [totalPercentage, setTotalPercentage] = useState('');
  const [laterSellPrice, setLaterSellPrice] = useState('');
  
  // Computed - الربح
  const [profit, setProfit] = useState(0);
  
  // State - العملية المحددة لعرض التفاصيل
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  
  // ========== الحسابات التلقائية ==========
  
  // (أ) سحب بطاقة - الحسابات التلقائية
  useEffect(() => {
    if (operationType === 'card_withdrawal' && customerTransferAmount && discountPercentage) {
      const transfer = parseFloat(customerTransferAmount);
      const discount = parseFloat(discountPercentage);
      
      // المسلّم للزبون = القيمة يلي بيحولها الزبون - نسبة الخصم
      const delivered = transfer - (transfer * discount / 100);
      setDeliveredToCustomer(delivered.toFixed(2));
      
      // الربح = الفرق
      const profitValue = transfer * discount / 100;
      setProfit(profitValue);
    }
  }, [operationType, customerTransferAmount, discountPercentage]);
  
  // (ب) تحويلات/إيداعات - الحسابات التلقائية (ديناميكي)
  // النوع 1: من الكاش إلى الحساب (cash_to_account) - زيادة
  // النوع 2: من الحساب إلى الكاش (account_to_cash) - خصم
  useEffect(() => {
    if ((operationType === 'transfer_deposit' || operationType === 'aman_exchange') && customerPaidAmount && transferPercentage) {
      const baseAmount = parseFloat(customerPaidAmount);
      const percentage = parseFloat(transferPercentage);
      
      if (isNaN(baseAmount) || baseAmount <= 0 || isNaN(percentage) || percentage < 0) {
        setDeliveredToCustomerTransfer('0.00');
        setProfit(0);
        return;
      }
      
      let resultAmount;
      let profitValue;
      
      if (transferType === 'cash_to_account') {
        // من الكاش إلى الحساب: الزبون يسلم أكثر (زيادة)
        // القيمة يلي لازم يسلمها = القيمة المطلوبة + (القيمة × النسبة ÷ 100)
        resultAmount = baseAmount + (baseAmount * percentage / 100);
        profitValue = baseAmount * percentage / 100;
      } else {
        // من الحساب إلى الكاش: الزبون يستلم أقل (خصم)
        // القيمة يلي يستلمها = القيمة المحولة - (القيمة × النسبة ÷ 100)
        resultAmount = baseAmount - (baseAmount * percentage / 100);
        profitValue = baseAmount * percentage / 100;
      }
      
      setDeliveredToCustomerTransfer(resultAmount.toFixed(2));
      setProfit(profitValue);
    } else {
      if (operationType === 'transfer_deposit' || operationType === 'aman_exchange') {
        setProfit(0);
      }
    }
  }, [operationType, transferType, customerPaidAmount, transferPercentage, percentageType]);
  
  // (د) شراء دولار - الحسابات التلقائية
  useEffect(() => {
    if ((operationType === 'dollar_buy_cash' || operationType === 'dollar_buy_bank') && dollarAmount && dinarDeliveredToCustomer) {
      const dollar = parseFloat(dollarAmount);
      const dinar = parseFloat(dinarDeliveredToCustomer);
      
      // سعر الشراء (سعرك أنت) = دينار ÷ دولار
      const buyPrice = dinar / dollar;
      setReferencePrice(buyPrice.toFixed(4));
      
      // حساب الربح: (سعر السوق - سعر الشراء) × الكمية
      // مثال: شراء بسعر 9.9 والسوق 10.02 = (10.02 - 9.9) × 1000 = +120 د.ل
      if (marketPrice) {
        const market = parseFloat(marketPrice);
        const profitValue = (market - buyPrice) * dollar;
        setProfit(profitValue);
      }
    }
  }, [operationType, dollarAmount, dinarDeliveredToCustomer, marketPrice]);
  
  // (هـ) بيع دولار - الحسابات التلقائية
  useEffect(() => {
    if ((operationType === 'dollar_sell_cash' || operationType === 'dollar_sell_bank') && dollarAmount && dinarReceivedFromCustomer) {
      const dollar = parseFloat(dollarAmount);
      const dinar = parseFloat(dinarReceivedFromCustomer);
      
      // سعر البيع (سعرك أنت) = دينار ÷ دولار
      const sellPrice = dinar / dollar;
      setSellPrice(sellPrice.toFixed(4));
      
      // حساب الربح: (سعر البيع - سعر السوق) × الكمية
      // مثال: بيع بسعر 5.00 والسوق 4.95 = (5.00 - 4.95) × 100 = +5 د.ل
      if (marketPrice) {
        const market = parseFloat(marketPrice);
        const profitValue = (sellPrice - market) * dollar;
        setProfit(profitValue);
      }
    }
  }, [operationType, dollarAmount, dinarReceivedFromCustomer, marketPrice]);
  
  // USDT شراء - الحسابات التلقائية
  useEffect(() => {
    if ((operationType === 'usdt_buy_cash' || operationType === 'usdt_buy_bank') && usdtAmount && usdtCommissionPercentage && networkFee && buyPrice) {
      const usdt = parseFloat(usdtAmount);
      const commission = parseFloat(usdtCommissionPercentage);
      const network = parseFloat(networkFee);
      const price = parseFloat(buyPrice);
      
      // القيمة المسلمة للزبون (USDT) = الكمية الأصلية - العمولة - رسوم الشبكة
      const deliveredToCustomer = usdt - (usdt * commission / 100) - network;
      setTotalAmount(deliveredToCustomer.toFixed(2));
      
      // القيمة بالدينار المدفوعة للزبون = (الكمية × سعر الشراء) - العمولة - رسوم الشبكة
      const baseAmount = usdt * price;
      const commissionAmount = baseAmount * (commission / 100);
      const networkFeeAmount = network * price;
      const dinarPaid = baseAmount - commissionAmount - networkFeeAmount;
      setDinarDeliveredToCustomer(dinarPaid.toFixed(2));
      
      // القيمة يلي تدخل لحسابنا (USDT) = الكمية الأصلية قبل الخصم
      setAmountToOurAccount(usdt.toFixed(2));
      
      // الربح = عمولة الخصم بالدينار
      setProfit(commissionAmount);
    }
  }, [operationType, usdtAmount, usdtCommissionPercentage, networkFee, buyPrice]);
  
  // USDT بيع - الحسابات التلقائية
  useEffect(() => {
    if ((operationType === 'usdt_sell_cash' || operationType === 'usdt_sell_bank') && usdtAmount && usdtCommissionPercentage && networkFee && sellPrice) {
      const usdt = parseFloat(usdtAmount);
      const commission = parseFloat(usdtCommissionPercentage);
      const network = parseFloat(networkFee);
      const price = parseFloat(sellPrice);
      
      // القيمة التي يستلمها الزبون (USDT) = الكمية المطلوبة
      setAmountToOurAccount(usdt.toFixed(2));
      
      // القيمة المرسلة منك (USDT) = الكمية + رسوم الشبكة
      const sentAmount = usdt + network;
      setTotalAmount(sentAmount.toFixed(2));
      
      // القيمة بالدينار المستلمة من الزبون = (الكمية × سعر البيع) + العمولة + رسوم الشبكة
      const baseAmount = usdt * price;
      const commissionAmount = baseAmount * (commission / 100);
      const networkFeeAmount = network * price;
      const dinarReceived = baseAmount + commissionAmount + networkFeeAmount;
      setDinarReceivedFromCustomer(dinarReceived.toFixed(2));
      
      // الربح = العمولة بالدينار
      setProfit(commissionAmount);
    }
  }, [operationType, usdtAmount, usdtCommissionPercentage, networkFee, sellPrice]);
  
  // (و) سحب بطاقات الدولار - الحسابات التلقائية
  useEffect(() => {
    if (operationType === 'dollar_card_withdrawal' && machinePercentage && companyPercentage) {
      const machine = parseFloat(machinePercentage);
      const company = parseFloat(companyPercentage);
      
      // النسبة الإجمالية
      const total = machine + company;
      setTotalPercentage(total.toFixed(2));
      
      // حساب الربح
      if (withdrawnDollar && marketPrice) {
        const withdrawn = parseFloat(withdrawnDollar);
        const market = parseFloat(marketPrice);
        
        // الربح بالدينار = withdrawn * total% * marketPrice
        const profitValue = withdrawn * (total / 100) * market;
        setProfit(profitValue);
        
        // إذا كان هناك سعر بيع لاحق
        if (laterSellPrice) {
          const later = parseFloat(laterSellPrice);
          const profitWithLater = withdrawn * (total / 100) * later;
          setProfit(profitWithLater);
        }
      }
    }
  }, [operationType, withdrawnDollar, machinePercentage, companyPercentage, marketPrice, laterSellPrice]);
  
  const resetForm = () => {
    setOperationType('');
    setPaymentMethod('cash');
    setBankAccountId('');
    setNotes('');
    
    // سحب بطاقة
    setDeliveredToCustomer('');
    setCustomerTransferAmount('');
    setDiscountPercentage('');
    
    // تحويلات
    setTransferType('account_to_cash');
    setCustomerPaidAmount('');
    setTransferPercentage('');
    setPercentageType('discount');
    setDeliveredToCustomerTransfer('');
    
    // دولار
    setDollarAmount('');
    setDinarDeliveredToCustomer('');
    setDinarReceivedFromCustomer('');
    setBuyPrice('');
    setSellPrice('');
    setMarketPrice('');
    setReferencePrice('');
    
    // USDT
    setUsdtAmount('');
    setUsdtCommissionPercentage('');
    setNetworkFee('');
    setAmountToOurAccount('');
    setDinarPaidToCustomer('');
    setDollarPaidToCustomer('');
    setTotalAmount('');
    
    // سحب بطاقات دولار
    setWithdrawnDollar('');
    setMachinePercentage('');
    setCompanyPercentage('');
    setTotalPercentage('');
    setLaterSellPrice('');
    
    setProfit(0);
  };
  
  const handleSubmit = () => {
    if (!operationType) {
      toast.error('يرجى اختيار نوع العملية');
      return;
    }
    
    // بناء البيانات حسب نوع العملية
    const data: any = {
      operationType,
      paymentMethod,
      bankAccountId: paymentMethod === 'bank' ? bankAccountId : undefined,
      notes: notes || undefined,
      profit,
      createdBy: user?.id?.toString() || '',
      createdByName: user?.fullName || 'مستخدم',
    };
    
    // إضافة الحقول حسب نوع العملية
    if (operationType === 'card_withdrawal') {
      data.deliveredToCustomer = parseFloat(deliveredToCustomer);
      data.customerTransferAmount = parseFloat(customerTransferAmount);
      data.discountPercentage = parseFloat(discountPercentage);
    }
    
    if (operationType === 'transfer_deposit' || operationType === 'aman_exchange') {
      data.transferType = transferType;
      data.customerPaidAmount = parseFloat(customerPaidAmount);
      data.transferPercentage = parseFloat(transferPercentage);
      data.percentageType = percentageType;
      data.deliveredToCustomerTransfer = parseFloat(deliveredToCustomerTransfer);
    }
    
    if (operationType === 'dollar_buy_cash' || operationType === 'dollar_buy_bank') {
      data.dollarAmount = parseFloat(dollarAmount);
      data.dinarDeliveredToCustomer = parseFloat(dinarDeliveredToCustomer);
      data.buyPrice = parseFloat(buyPrice);
      data.marketPrice = marketPrice ? parseFloat(marketPrice) : undefined;
      data.referencePrice = parseFloat(referencePrice);
    }
    
    if (operationType === 'dollar_sell_cash' || operationType === 'dollar_sell_bank') {
      data.dollarAmount = parseFloat(dollarAmount);
      data.dinarReceivedFromCustomer = parseFloat(dinarReceivedFromCustomer);
      data.sellPrice = parseFloat(sellPrice);
      data.marketPrice = marketPrice ? parseFloat(marketPrice) : undefined;
      data.referencePrice = referencePrice ? parseFloat(referencePrice) : undefined;
    }
    
    if (operationType === 'usdt_buy_cash' || operationType === 'usdt_buy_bank') {
      data.usdtAmount = parseFloat(usdtAmount);
      data.usdtCommissionPercentage = parseFloat(usdtCommissionPercentage);
      data.networkFee = parseFloat(networkFee);
      data.amountToOurAccount = parseFloat(amountToOurAccount);
      data.buyPrice = parseFloat(buyPrice);
      data.dinarPaidToCustomer = dinarPaidToCustomer ? parseFloat(dinarPaidToCustomer) : undefined;
      data.dollarPaidToCustomer = dollarPaidToCustomer ? parseFloat(dollarPaidToCustomer) : undefined;
      data.totalAmount = parseFloat(totalAmount);
    }
    
    if (operationType === 'usdt_sell_cash' || operationType === 'usdt_sell_bank') {
      data.usdtAmount = parseFloat(usdtAmount);
      data.usdtCommissionPercentage = parseFloat(usdtCommissionPercentage);
      data.networkFee = parseFloat(networkFee);
      data.amountToOurAccount = parseFloat(amountToOurAccount);
      data.sellPrice = parseFloat(sellPrice);
      data.totalAmount = parseFloat(totalAmount);
      data.referencePrice = referencePrice ? parseFloat(referencePrice) : undefined;
    }
    
    if (operationType === 'dollar_card_withdrawal') {
      data.withdrawnDollar = parseFloat(withdrawnDollar);
      data.machinePercentage = parseFloat(machinePercentage);
      data.companyPercentage = parseFloat(companyPercentage);
      data.totalPercentage = parseFloat(totalPercentage);
      data.marketPrice = marketPrice ? parseFloat(marketPrice) : undefined;
      data.laterSellPrice = laterSellPrice ? parseFloat(laterSellPrice) : undefined;
    }
    
    createOperation.mutate(data);
  };
  
  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه العملية؟')) {
      deleteOperation.mutate({ 
        id,
        deletedBy: user?.id || 'unknown',
        deletedByName: user?.fullName || 'غير محدد',
      });
    }
  };
  
  const getOperationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'card_withdrawal': 'سحب بطاقة/LYPay/OnePay/إيفاء/رسائل',
      'transfer_deposit': 'تحويلات/إيداعات',
      'aman_exchange': 'صيرفة الأمان',
      'dollar_buy_cash': 'شراء دولار - كاش',
      'dollar_buy_bank': 'شراء دولار - مصرفي',
      'dollar_sell_cash': 'بيع دولار - كاش',
      'dollar_sell_bank': 'بيع دولار - مصرفي',
      'usdt_buy_cash': 'شراء USDT - كاش',
      'usdt_buy_bank': 'شراء USDT - مصرفي',
      'usdt_sell_cash': 'بيع USDT - كاش',
      'usdt_sell_bank': 'بيع USDT - مصرفي',
      'dollar_card_withdrawal': 'سحب بطاقات الدولار',
    };
    return labels[type] || type;
  };
  
  // دالة لعرض النسبة حسب نوع العملية
  const getPercentage = (op: any) => {
    if (op.discountPercentage) return `${op.discountPercentage}%`;
    if (op.transferPercentage) return `${op.transferPercentage}%`;
    if (op.usdtCommissionPercentage) return `${op.usdtCommissionPercentage}%`;
    if (op.machinePercentage && op.companyPercentage) return `${parseFloat(op.machinePercentage) + parseFloat(op.companyPercentage)}%`;
    return '-';
  };
  
  // دالة لتنسيق التاريخ والوقت
  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  };
  
  // دالة تصدير PDF - استخدام window.print() مع دعم كامل للعربية والشعار
  const exportToPDF = () => {
    window.print();
  };
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: BRAND_COLORS.background }}>
      <PageHeader title="العمليات اليومية" />
      
      <div className="container mx-auto p-2 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          {hasPermission('add_operation') && (
            <Button
              onClick={() => setShowAddDialog(true)}
              style={{ backgroundColor: BRAND_COLORS.navy, color: 'white' }}
              className="text-xs md:text-sm"
            >
              <Plus className="mr-2 h-3 w-3 md:h-4 md:w-4" />
              إضافة عملية جديدة
            </Button>
          )}
          
          <Button
            onClick={() => window.print()}
            variant="outline"
            style={{ borderColor: BRAND_COLORS.navy, color: BRAND_COLORS.navy }}
            className="text-xs md:text-sm"
          >
            <Printer className="mr-2 h-3 w-3 md:h-4 md:w-4" />
            طباعة
          </Button>
          
          <Button
            onClick={exportToPDF}
            variant="outline"
            style={{ borderColor: BRAND_COLORS.gold, color: BRAND_COLORS.gold }}
            className="text-xs md:text-sm"
          >
            <FileDown className="mr-2 h-3 w-3 md:h-4 md:w-4" />
            حفظ PDF
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">عدد العمليات</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold" style={{ color: BRAND_COLORS.navy }}>
                {operations.length}
              </div>
            </CardContent>
          </Card>
          
          <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">إجمالي الربح</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold" style={{ color: BRAND_COLORS.navy }}>
                {operations.reduce((sum, op) => sum + parseFloat(op.profit || '0'), 0).toFixed(2)} د.ل
              </div>
            </CardContent>
          </Card>
          
          <Card style={{ borderTop: `4px solid ${BRAND_COLORS.gold}` }}>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium">اليوم</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <div className="text-lg md:text-2xl font-bold" style={{ color: BRAND_COLORS.navy }}>
                {(() => {
                  const today = new Date();
                  const day = String(today.getDate()).padStart(2, '0');
                  const month = String(today.getMonth() + 1).padStart(2, '0');
                  const year = today.getFullYear();
                  return `${day}/${month}/${year}`;
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Table */}
        <Card>
          <CardHeader style={{ backgroundColor: BRAND_COLORS.navy }} className="p-3 md:p-6">
            <CardTitle className="text-white text-sm md:text-base">جميع العمليات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">نوع العملية</TableHead>
                    <TableHead className="text-xs md:text-sm hidden md:table-cell">النسبة</TableHead>
                    <TableHead className="text-xs md:text-sm">الربح</TableHead>
                    <TableHead className="text-xs md:text-sm hidden lg:table-cell">التاريخ والوقت</TableHead>
                    <TableHead className="text-xs md:text-sm">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 text-xs md:text-sm">
                        لا توجد عمليات بعد
                      </TableCell>
                    </TableRow>
                  ) : (
                    operations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="text-xs md:text-sm">{getOperationTypeLabel(op.operationType)}</TableCell>
                        <TableCell className="text-xs md:text-sm hidden md:table-cell" dir="ltr">
                          {getPercentage(op)}
                        </TableCell>
                        <TableCell style={{ color: BRAND_COLORS.gold, fontWeight: 'bold' }} className="text-xs md:text-sm" dir="ltr">
                          {parseFloat(op.profit || '0').toFixed(2)} د.ل
                        </TableCell>
                        <TableCell className="text-xs md:text-sm hidden lg:table-cell" dir="ltr">
                          {formatDateTime(op.createdAt!)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedOperation(op)}
                              style={{ color: BRAND_COLORS.navy }}
                              className="p-1"
                              title="إظهار التفاصيل"
                            >
                              <Eye className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            {hasPermission('delete_operation') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(op.id)}
                                style={{ color: BRAND_COLORS.error }}
                                className="p-1"
                                title="حذف"
                              >
                                <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Add Dialog - سيتم إكماله في الجزء التالي */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ color: BRAND_COLORS.navy }}>إضافة عملية جديدة</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3 md:space-y-4">
              {/* نوع العملية */}
              <div className="grid gap-2">
                <Label className="text-xs md:text-sm">نوع العملية *</Label>
                <Select value={operationType} onValueChange={setOperationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العملية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card_withdrawal">سحب بطاقة/LYPay/OnePay/إيفاء/رسائل</SelectItem>
                    <SelectItem value="transfer_deposit">تحويلات/إيداعات</SelectItem>
                    <SelectItem value="aman_exchange">صيرفة الأمان</SelectItem>
                    <SelectItem value="dollar_buy_cash">شراء دولار - كاش</SelectItem>
                    <SelectItem value="dollar_buy_bank">شراء دولار - مصرفي</SelectItem>
                    <SelectItem value="dollar_sell_cash">بيع دولار - كاش</SelectItem>
                    <SelectItem value="dollar_sell_bank">بيع دولار - مصرفي</SelectItem>
                    <SelectItem value="usdt_buy_cash">شراء USDT - كاش</SelectItem>
                    <SelectItem value="usdt_buy_bank">شراء USDT - مصرفي</SelectItem>
                    <SelectItem value="usdt_sell_cash">بيع USDT - كاش</SelectItem>
                    <SelectItem value="usdt_sell_bank">بيع USDT - مصرفي</SelectItem>
                    <SelectItem value="dollar_card_withdrawal">سحب بطاقات الدولار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* بيانات الزبون */}
              {/* نوع العملية */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                {/* لعمليات الخزينة المربوطة: اختيار الحساب البنكي مباشرة */}
                {(operationType === 'card_withdrawal' || 
                  operationType === 'transfer_deposit' || 
                  operationType === 'aman_exchange' ||
                  operationType === 'dollar_buy_bank' ||
                  operationType === 'dollar_sell_bank' ||
                  operationType === 'usdt_buy_bank' ||
                  operationType === 'usdt_sell_bank') ? (
                  <div className="grid gap-2">
                    <Label className="text-xs md:text-sm">
                      {operationType === 'card_withdrawal' ? 'الحساب البنكي المستلم *' : 'الحساب البنكي *'}
                    </Label>
                    <Select value={bankAccountId} onValueChange={setBankAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحساب البنكي..." />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.bankName} - {acc.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    {/* تم إلغاء حقل طريقة الدفع */}
                    
                    {paymentMethod === 'bank' && (
                      <div className="grid gap-2">
                        <Label className="text-xs md:text-sm">الحساب البنكي</Label>
                        <Select value={bankAccountId} onValueChange={setBankAccountId}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.bankName} - {acc.accountName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* النموذج الديناميكي - حسب نوع العملية */}
              {operationType === 'card_withdrawal' && (
                <div className="space-y-3 md:space-y-4 p-3 md:p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>سحب بطاقة/LYPay/OnePay/إيفاء/رسائل</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة يلي بيحولها الزبون (دينار) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customerTransferAmount}
                        onChange={(e) => setCustomerTransferAmount(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">نسبة الخصم (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={discountPercentage}
                        onChange={(e) => setDiscountPercentage(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">المسلّم للزبون (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={deliveredToCustomer}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  {/* الصندوق الذهبي التوضيحي */}
                  {customerTransferAmount && discountPercentage && deliveredToCustomer && (
                    <div className="mt-4 p-4 rounded-lg border-2" style={{ 
                      backgroundColor: '#FFFBF0',
                      borderColor: BRAND_COLORS.gold 
                    }}>
                      <h4 className="text-sm font-bold mb-3" style={{ color: BRAND_COLORS.navy }}>
                        تأثير العملية على الخزينة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* البنك يزيد */}
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">✅</span>
                            <span className="text-xs font-semibold" style={{ color: '#2E7D32' }}>البنك يزيد</span>
                          </div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }} dir="ltr">
                            +{parseFloat(customerTransferAmount).toFixed(2)} د.ل
                          </div>
                        </div>
                        
                        {/* الكاش ينقص */}
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">❌</span>
                            <span className="text-xs font-semibold" style={{ color: '#C62828' }}>الكاش ينقص</span>
                          </div>
                          <div className="text-lg font-bold" style={{ color: '#C62828' }} dir="ltr">
                            -{parseFloat(deliveredToCustomer).toFixed(2)} د.ل
                          </div>
                        </div>
                        
                        {/* الربح */}
                        <div className="p-3 rounded-lg" style={{ backgroundColor: profit >= 0 ? '#E8F5E9' : '#FFEBEE' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{profit >= 0 ? '✅' : '❌'}</span>
                            <span className="text-xs font-semibold" style={{ color: profit >= 0 ? '#2E7D32' : '#C62828' }}>الربح</span>
                          </div>
                          <div className="text-lg font-bold" style={{ color: profit >= 0 ? '#2E7D32' : '#C62828' }} dir="ltr">
                            {profit >= 0 ? '+' : ''}{profit.toFixed(2)} د.ل
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(operationType === 'transfer_deposit' || operationType === 'aman_exchange') && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    {operationType === 'transfer_deposit' ? 'تحويلات/إيداعات' : 'صيرفة الأمان'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">نوع التحويل</Label>
                      <Select value={transferType} onValueChange={(v: 'account_to_cash' | 'cash_to_account') => setTransferType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="account_to_cash">من الحساب إلى كاش</SelectItem>
                          <SelectItem value="cash_to_account">من كاش إلى الحساب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">
                        {transferType === 'cash_to_account' 
                          ? 'القيمة يلي الزبون يريدها (دينار) *' 
                          : 'القيمة يلي حولها الزبون (دينار) *'}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={customerPaidAmount}
                        onChange={(e) => setCustomerPaidAmount(e.target.value)}
                        dir="ltr"
                        placeholder="1000"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">
                        {transferType === 'cash_to_account' 
                          ? 'نسبة الزيادة (%) *' 
                          : 'نسبة الخصم (%) *'}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={transferPercentage}
                        onChange={(e) => setTransferPercentage(e.target.value)}
                        dir="ltr"
                        placeholder="5"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">
                        {transferType === 'cash_to_account' 
                          ? 'القيمة يلي لازم يسلمها (تلقائي)' 
                          : 'القيمة يلي يستلمها الزبون (تلقائي)'}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={deliveredToCustomerTransfer}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  {/* خانات الربط مع الخزينة */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '2px solid #C9A34D' }}>
                    {transferType === 'cash_to_account' ? (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-xs md:text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>
                            القيمة التي تدخل لحساب الكاش (دينار) ✅
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={deliveredToCustomerTransfer}
                            disabled
                            style={{ backgroundColor: '#C8E6C9', fontWeight: 'bold', color: '#2E7D32' }}
                            dir="ltr"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs md:text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>
                            القيمة التي تخرج من الحساب البنكي (دينار) ❌
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={customerPaidAmount}
                            disabled
                            style={{ backgroundColor: '#FFCDD2', fontWeight: 'bold', color: '#C62828' }}
                            dir="ltr"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-xs md:text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>
                            القيمة التي تخرج من حساب الكاش (دينار) ❌
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={deliveredToCustomerTransfer}
                            disabled
                            style={{ backgroundColor: '#FFCDD2', fontWeight: 'bold', color: '#C62828' }}
                            dir="ltr"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs md:text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>
                            القيمة التي تدخل للحساب البنكي (دينار) ✅
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={customerPaidAmount}
                            disabled
                            style={{ backgroundColor: '#C8E6C9', fontWeight: 'bold', color: '#2E7D32' }}
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {(operationType === 'dollar_buy_cash' || operationType === 'dollar_buy_bank') && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    شراء دولار - {operationType === 'dollar_buy_cash' ? 'كاش' : 'مصرفي'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدولار *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dollarAmount}
                        onChange={(e) => setDollarAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدينار المدفوعة للزبون *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dinarDeliveredToCustomer}
                        onChange={(e) => setDinarDeliveredToCustomer(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر الشراء *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر السوق</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={marketPrice}
                        onChange={(e) => setMarketPrice(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">السعر المرجعي (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={referencePrice}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                      />
                    </div>
                  </div>
                  
                  {/* خانات توضيحية للأرصدة */}
                  {dollarAmount && dinarDeliveredToCustomer && (
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', border: '2px solid ' + BRAND_COLORS.gold }}>
                      <h4 className="text-sm font-bold mb-3" style={{ color: BRAND_COLORS.navy }}>تأثير العملية على الخزينة:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded" style={{ backgroundColor: '#FFEBEE' }}>
                          <p className="text-xs font-semibold" style={{ color: BRAND_COLORS.navy }}>
                            {operationType === 'dollar_buy_cash' ? 'الكاش ينقص' : 'البنك ينقص'} ❌
                          </p>
                          <p className="text-lg font-bold" style={{ color: '#C62828' }} dir="ltr">
                            -{parseFloat(dinarDeliveredToCustomer).toFixed(2)} د.ل
                          </p>
                        </div>
                        <div className="p-3 rounded" style={{ backgroundColor: '#E8F5E9' }}>
                          <p className="text-xs font-semibold" style={{ color: BRAND_COLORS.navy }}>
                            رصيد الدولار يزيد ✅
                          </p>
                          <p className="text-lg font-bold" style={{ color: '#2E7D32' }} dir="ltr">
                            +{parseFloat(dollarAmount).toFixed(2)} $
                          </p>
                        </div>
                        <div className="p-3 rounded" style={{ backgroundColor: marketPrice && profit !== null ? (profit >= 0 ? '#E8F5E9' : '#FFEBEE') : '#F5F5F5' }}>
                          <p className="text-xs font-semibold" style={{ color: BRAND_COLORS.navy }}>
                            {marketPrice && profit !== null ? (profit >= 0 ? 'الربح ✅' : 'الخسارة ❌') : 'الربح (أدخل سعر السوق)'}
                          </p>
                          <p className="text-lg font-bold" style={{ color: marketPrice && profit !== null ? (profit >= 0 ? '#2E7D32' : '#C62828') : '#757575' }} dir="ltr">
                            {marketPrice && profit !== null ? `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} د.ل` : '0.00 د.ل'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(operationType === 'dollar_sell_cash' || operationType === 'dollar_sell_bank') && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    بيع دولار - {operationType === 'dollar_sell_cash' ? 'كاش' : 'مصرفي'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدولار *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dollarAmount}
                        onChange={(e) => setDollarAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدينار المستلمة من الزبون *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dinarReceivedFromCustomer}
                        onChange={(e) => setDinarReceivedFromCustomer(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر البيع (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={sellPrice}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر السوق *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={marketPrice}
                        onChange={(e) => setMarketPrice(e.target.value)}
                        placeholder="أدخل سعر السوق"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  {/* خانات توضيحية لتأثير العملية على الخزينة */}
                  {dollarAmount && dinarReceivedFromCustomer && (
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: BRAND_COLORS.gold, backgroundColor: '#FFFBF0' }}>
                      <h4 className="font-bold mb-3 text-sm" style={{ color: BRAND_COLORS.navy }}>
                        تأثير العملية على الخزينة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="text-xs text-gray-600 mb-1">الكاش يزيد ✅</div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>
                            +{parseFloat(dinarReceivedFromCustomer || '0').toFixed(2)} د.ل
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                          <div className="text-xs text-gray-600 mb-1">رصيد الدولار ينقص ❌</div>
                          <div className="text-lg font-bold" style={{ color: '#C62828' }}>
                            -{parseFloat(dollarAmount || '0').toFixed(2)} $
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: marketPrice ? '#E8F5E9' : '#F5F5F5' }}>
                          <div className="text-xs text-gray-600 mb-1">
                            {marketPrice ? 'الربح ✅' : 'الربح (أدخل سعر السوق)'}
                          </div>
                          <div className="text-lg font-bold" style={{ color: marketPrice ? ((parseFloat(sellPrice.toString()) - parseFloat(marketPrice)) >= 0 ? '#2E7D32' : '#C62828') : '#9E9E9E' }}>
                            {marketPrice ? `${((parseFloat(sellPrice.toString()) - parseFloat(marketPrice)) * parseFloat(dollarAmount)).toFixed(2)} د.ل` : '0.00 د.ل'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(operationType === 'usdt_buy_cash' || operationType === 'usdt_buy_bank') && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    شراء USDT - {operationType === 'usdt_buy_cash' ? 'كاش' : 'مصرفي'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة USDT *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usdtAmount}
                        onChange={(e) => setUsdtAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">عمولة نسبة (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usdtCommissionPercentage}
                        onChange={(e) => setUsdtCommissionPercentage(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">عمولة الشبكة *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={networkFee}
                        onChange={(e) => setNetworkFee(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر الشراء *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={buyPrice}
                        onChange={(e) => setBuyPrice(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدينار (اختياري)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dinarPaidToCustomer}
                        onChange={(e) => setDinarPaidToCustomer(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدولار (اختياري)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dollarPaidToCustomer}
                        onChange={(e) => setDollarPaidToCustomer(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة لحسابنا (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={amountToOurAccount}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة المسلمة للزبون (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدينار (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dinarDeliveredToCustomer}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  {/* خانات توضيحية لتأثير العملية على الخزينة */}
                  {usdtAmount && buyPrice && (
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: BRAND_COLORS.gold, backgroundColor: '#FFFBF0' }}>
                      <h4 className="font-bold mb-3 text-sm" style={{ color: BRAND_COLORS.navy }}>
                        تأثير العملية على الخزينة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                          <div className="text-xs text-gray-600 mb-1">
                            {operationType === 'usdt_buy_cash' ? 'الكاش ينقص' : 'البنك ينقص'} ❌
                          </div>
                          <div className="text-lg font-bold" style={{ color: '#C62828' }}>
                            -{parseFloat(dinarDeliveredToCustomer || '0').toFixed(2)} د.ل
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="text-xs text-gray-600 mb-1">رصيد USDT يزيد ✅</div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>
                            +{parseFloat(amountToOurAccount || '0').toFixed(2)} USDT
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="text-xs text-gray-600 mb-1">الربح ✅</div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>
                            +{parseFloat(profit?.toString() || '0').toFixed(2)} د.ل
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(operationType === 'usdt_sell_cash' || operationType === 'usdt_sell_bank') && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>
                    بيع USDT - {operationType === 'usdt_sell_cash' ? 'كاش' : 'مصرفي'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة USDT *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usdtAmount}
                        onChange={(e) => setUsdtAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">عمولة زيادة (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={usdtCommissionPercentage}
                        onChange={(e) => setUsdtCommissionPercentage(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">عمولة الشبكة *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={networkFee}
                        onChange={(e) => setNetworkFee(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر البيع *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={sellPrice}
                        onChange={(e) => setSellPrice(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة المرسلة (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">القيمة بالدينار (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={dinarReceivedFromCustomer}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  
                  {/* خانات توضيحية لتأثير العملية على الخزينة */}
                  {usdtAmount && sellPrice && (
                    <div className="p-4 rounded-lg border-2" style={{ borderColor: BRAND_COLORS.gold, backgroundColor: '#FFFBF0' }}>
                      <h4 className="font-bold mb-3 text-sm" style={{ color: BRAND_COLORS.navy }}>
                        تأثير العملية على الخزينة
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="text-xs text-gray-600 mb-1">
                            {operationType === 'usdt_sell_cash' ? 'الكاش يزيد' : 'البنك يزيد'} ✅
                          </div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>
                            +{parseFloat(dinarReceivedFromCustomer || '0').toFixed(2)} د.ل
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FFEBEE' }}>
                          <div className="text-xs text-gray-600 mb-1">رصيد USDT ينقص ❌</div>
                          <div className="text-lg font-bold" style={{ color: '#C62828' }}>
                            -{parseFloat(totalAmount || '0').toFixed(2)} USDT
                          </div>
                        </div>
                        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                          <div className="text-xs text-gray-600 mb-1">الربح ✅</div>
                          <div className="text-lg font-bold" style={{ color: '#2E7D32' }}>
                            +{parseFloat(profit?.toString() || '0').toFixed(2)} د.ل
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {operationType === 'dollar_card_withdrawal' && (
                <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>سحب بطاقات الدولار</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">دولار مستلم (المسحوب) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={withdrawnDollar}
                        onChange={(e) => setWithdrawnDollar(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">نسبة ماكينة (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={machinePercentage}
                        onChange={(e) => setMachinePercentage(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">نسبة شركة (%) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={companyPercentage}
                        onChange={(e) => setCompanyPercentage(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">النسبة الإجمالية (تلقائي)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={totalPercentage}
                        disabled
                        style={{ backgroundColor: '#E8F5E9' }}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر السوق *</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={marketPrice}
                        onChange={(e) => setMarketPrice(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs md:text-sm">سعر بيع لاحق (اختياري)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={laterSellPrice}
                        onChange={(e) => setLaterSellPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* الربح */}
              {operationType && (
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9', borderRight: `4px solid ${BRAND_COLORS.gold}` }}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold" style={{ color: BRAND_COLORS.navy }}>الربح المحسوب تلقائياً:</span>
                    <span className="text-2xl font-bold" style={{ color: BRAND_COLORS.gold }} dir="ltr">
                      {profit.toFixed(2)} د.ل
                    </span>
                  </div>
                </div>
              )}
              
              {/* ملاحظات */}
              <div className="grid gap-2">
                <Label className="text-xs md:text-sm">ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              
              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmit}
                  style={{ backgroundColor: BRAND_COLORS.navy, color: 'white' }}
                  disabled={createOperation.isPending}
                >
                  {createOperation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* نافذة عرض التفاصيل */}
        <Dialog open={!!selectedOperation} onOpenChange={() => setSelectedOperation(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ color: BRAND_COLORS.navy }}>
                تفاصيل العملية - {selectedOperation && getOperationTypeLabel(selectedOperation.operationType)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedOperation && (
              <div className="space-y-4">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                  <div>
                    <p className="text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>نوع العملية:</p>
                    <p className="text-sm">{getOperationTypeLabel(selectedOperation.operationType)}</p>
                  </div>
                  {/* تم إلغاء عرض طريقة الدفع */}
                  <div>
                    <p className="text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>التاريخ والوقت:</p>
                    <p className="text-sm" dir="ltr">{formatDateTime(selectedOperation.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: BRAND_COLORS.gold }}>الربح:</p>
                    <p className="text-lg font-bold" style={{ color: BRAND_COLORS.gold }} dir="ltr">{parseFloat(selectedOperation.profit || '0').toFixed(2)} د.ل</p>
                  </div>
                </div>
                
                {/* تفاصيل حسب نوع العملية */}
                {selectedOperation.operationType === 'card_withdrawal' && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل سحب البطاقة</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">القيمة المحولة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.customerTransferAmount} د.ل</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">نسبة الخصم:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.discountPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">المسلم للزبون:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.deliveredToCustomer} د.ل</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {(selectedOperation.operationType === 'transfer_deposit' || selectedOperation.operationType === 'aman_exchange') && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل التحويل</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">القيمة المسلمة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.customerPaidAmount} د.ل</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">النسبة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.transferPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">المسلم للزبون:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.deliveredToCustomerTransfer} د.ل</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedOperation.operationType === 'dollar_buy_cash' && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل شراء الدولار - كاش</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">كمية الدولار:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dollarAmount} $</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">الدينار المسلم للزبون:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dinarDeliveredToCustomer} د.ل</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر الشراء:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.buyPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر السوق:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.marketPrice}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedOperation.operationType === 'dollar_sell_cash' && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل بيع الدولار - كاش</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">كمية الدولار:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dollarAmount} $</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">الدينار المستلم:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dinarReceivedFromCustomer} د.ل</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر البيع:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.sellPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر السوق:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.marketPrice}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {(selectedOperation.operationType === 'usdt_buy_cash' || selectedOperation.operationType === 'usdt_buy_bank') && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل شراء USDT</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">كمية USDT:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.usdtAmount} USDT</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">نسبة العمولة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.usdtCommissionPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">رسوم الشبكة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.networkFee} USDT</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر الشراء:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.buyPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">الدينار المدفوع:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dinarPaidToCustomer} د.ل</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">الدولار المدفوع:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.dollarPaidToCustomer} $</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {(selectedOperation.operationType === 'usdt_sell_cash' || selectedOperation.operationType === 'usdt_sell_bank') && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل بيع USDT</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">كمية USDT:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.usdtAmount} USDT</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">نسبة العمولة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.usdtCommissionPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">رسوم الشبكة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.networkFee} USDT</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر البيع:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.sellPrice}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">السعر المرجعي:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.referencePrice}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedOperation.operationType === 'dollar_card_withdrawal' && (
                  <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: '#E8F5E9' }}>
                    <h3 className="font-bold" style={{ color: BRAND_COLORS.navy }}>تفاصيل سحب بطاقات الدولار</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm font-semibold">الدولار المسحوب:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.withdrawnDollar} $</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">نسبة الماكينة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.machinePercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">نسبة الشركة:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.companyPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">النسبة الكلية:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.totalPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">سعر السوق:</p>
                        <p className="text-sm" dir="ltr">{selectedOperation.marketPrice}</p>
                      </div>
                      {selectedOperation.laterSellPrice && (
                        <div>
                          <p className="text-sm font-semibold">سعر بيع لاحق:</p>
                          <p className="text-sm" dir="ltr">{selectedOperation.laterSellPrice}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* الملاحظات */}
                {selectedOperation.notes && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#FFF9E6', borderRight: `4px solid ${BRAND_COLORS.gold}` }}>
                    <p className="text-sm font-bold mb-2" style={{ color: BRAND_COLORS.navy }}>ملاحظات:</p>
                    <p className="text-sm">{selectedOperation.notes}</p>
                  </div>
                )}
                
                {/* الحساب البنكي */}
                {selectedOperation.paymentMethod === 'bank' && selectedOperation.bankAccountId && (
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#F1F4F8' }}>
                    <p className="text-sm font-bold" style={{ color: BRAND_COLORS.navy }}>الحساب البنكي المستخدم:</p>
                    <p className="text-sm">معرف الحساب: {selectedOperation.bankAccountId}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setSelectedOperation(null)} style={{ backgroundColor: BRAND_COLORS.navy, color: 'white' }}>
                إغلاق
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
