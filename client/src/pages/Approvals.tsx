import { useState } from "react";
import { useApprovals } from "@/contexts/ApprovalsContext";
// import { useTreasury } from "@/contexts/TreasuryContext"; // تم حذف TreasuryContext القديم
import { useLogs } from "@/contexts/LogsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, User, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import type { DailyCloseRequest } from "@/types/approvals";

/**
 * صفحة موافقات المدير
 * Manager Approvals Page
 * 
 * - عرض جميع طلبات إغلاق اليوم
 * - الموافقة أو الرفض مع السبب
 * - إحصائيات الطلبات
 */

export default function Approvals() {
  const { requests, approveRequest, rejectRequest, getPendingRequests, getStats } = useApprovals();
  // const { closeCustody, getCurrentCustody } = useTreasury(); // تم حذف TreasuryContext القديم
  const { addAuditTrail } = useLogs();
  const { user } = useAuth();

  const [selectedRequest, setSelectedRequest] = useState<DailyCloseRequest | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const stats = getStats();
  const pendingRequests = getPendingRequests();

  const handleApprove = (request: DailyCloseRequest) => {
    // الموافقة على الطلب
    approveRequest(request.id, user?.fullName || 'مدير', user?.id.toString() || 'unknown');

    // إغلاق العهدة فعلياً
    // TODO: ربط بالخزينة الجديدة - إغلاق العهدة
    if (false) { // مؤقتاً
    }

    // تسجيل في السجلات
    addAuditTrail({
      action: 'approve_daily_close',
      entityType: 'daily_close',
      entityId: request.id,
      userId: user?.id.toString() || 'unknown',
      userName: user?.fullName || 'مدير',
      details: {
        description: `الموافقة على إغلاق اليوم - الموظف: ${request.requestedBy}`,
        before: { status: 'pending' },
        after: { 
          status: 'approved',
          closingBalance: request.closingBalance,
          totalProfit: request.totalProfit,
        },
      },
      status: 'success',
    });

    toast.success('تمت الموافقة على الطلب وإغلاق اليوم بنجاح');
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('الرجاء كتابة سبب الرفض');
      return;
    }

    // رفض الطلب
    rejectRequest(
      selectedRequest.id,
      user?.fullName || 'مدير',
      user?.id.toString() || 'unknown',
      rejectionReason
    );

    // تسجيل في السجلات
    addAuditTrail({
      action: 'reject_daily_close',
      entityType: 'daily_close',
      entityId: selectedRequest.id,
      userId: user?.id.toString() || 'unknown',
      userName: user?.fullName || 'مدير',
      details: {
        description: `رفض إغلاق اليوم - الموظف: ${selectedRequest.requestedBy}`,
        before: { status: 'pending' },
        after: { 
          status: 'rejected',
          reason: rejectionReason,
        },
      },
      status: 'success',
    });

    toast.success('تم رفض الطلب');
    setShowRejectDialog(false);
    setSelectedRequest(null);
    setRejectionReason("");
  };

  const getStatusBadge = (status: DailyCloseRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-300"><Clock className="w-3 h-3 mr-1" /> قيد الانتظار</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-300"><CheckCircle className="w-3 h-3 mr-1" /> موافق عليه</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-300"><XCircle className="w-3 h-3 mr-1" /> مرفوض</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="container max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">موافقات إغلاق اليوم</h1>
          <p className="text-slate-600">مراجعة والموافقة على طلبات إغلاق اليوم من الموظفين</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">إجمالي الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">موافق عليها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">مرفوضة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">طلبات قيد الانتظار</h2>
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map(request => (
                <Card key={request.id} className="bg-white border-2 border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">طلب إغلاق يوم {format(request.date, 'dd MMMM yyyy', { locale: ar })}</CardTitle>
                        <CardDescription className="mt-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>الموظف: {request.requestedBy}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            <span>وقت الطلب: {format(request.requestedAt, 'dd/MM/yyyy - hh:mm a', { locale: ar })}</span>
                          </div>
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">عدد العمليات</div>
                        <div className="text-xl font-bold text-slate-800">{request.totalOperations}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>إجمالي الإيرادات</span>
                        </div>
                        <div className="text-xl font-bold text-blue-600">{request.totalRevenue.toFixed(2)} LYD</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>إجمالي الأرباح</span>
                        </div>
                        <div className="text-xl font-bold text-green-600">{request.totalProfit.toFixed(2)} LYD</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">الرصيد الختامي</div>
                        <div className="text-xl font-bold text-purple-600">{request.closingBalance.toFixed(2)} LYD</div>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="bg-slate-50 p-3 rounded-lg mb-4">
                        <div className="text-sm text-slate-600 mb-1">ملاحظات:</div>
                        <div className="text-slate-800">{request.notes}</div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(request)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        الموافقة وإغلاق اليوم
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRejectDialog(true);
                        }}
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        رفض الطلب
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Requests History */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">سجل جميع الطلبات</h2>
          <div className="grid grid-cols-1 gap-4">
            {requests.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="py-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600">لا توجد طلبات حتى الآن</p>
                </CardContent>
              </Card>
            ) : (
              requests.map(request => (
                <Card key={request.id} className="bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>طلب إغلاق يوم {format(request.date, 'dd MMMM yyyy', { locale: ar })}</CardTitle>
                        <CardDescription className="mt-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>الموظف: {request.requestedBy}</span>
                          </div>
                        </CardDescription>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">عدد العمليات</div>
                        <div className="text-lg font-bold text-slate-800">{request.totalOperations}</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">الإيرادات</div>
                        <div className="text-lg font-bold text-blue-600">{request.totalRevenue.toFixed(2)} LYD</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">الأرباح</div>
                        <div className="text-lg font-bold text-green-600">{request.totalProfit.toFixed(2)} LYD</div>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">الرصيد الختامي</div>
                        <div className="text-lg font-bold text-purple-600">{request.closingBalance.toFixed(2)} LYD</div>
                      </div>
                    </div>

                    {request.status !== 'pending' && request.reviewedBy && (
                      <div className="mt-4 bg-slate-50 p-3 rounded-lg">
                        <div className="text-sm text-slate-600">
                          {request.status === 'approved' ? 'تمت الموافقة' : 'تم الرفض'} بواسطة: {request.reviewedBy}
                        </div>
                        <div className="text-sm text-slate-600">
                          في: {request.reviewedAt && format(request.reviewedAt, 'dd/MM/yyyy - hh:mm a', { locale: ar })}
                        </div>
                        {request.rejectionReason && (
                          <div className="mt-2 text-sm text-red-600">
                            سبب الرفض: {request.rejectionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض طلب الإغلاق</DialogTitle>
            <DialogDescription>
              الرجاء كتابة سبب رفض الطلب لإبلاغ الموظف
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">سبب الرفض</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: يوجد خطأ في حساب الأرباح، الرجاء المراجعة..."
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedRequest(null);
                setRejectionReason("");
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
