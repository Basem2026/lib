import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function DataEntryDashboard() {
  const { user, isLoading } = useAuth();
  const { addCustomer } = useCustomers();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  // Redirect if not data_entry role
  useEffect(() => {
    if (!isLoading && user && user.jobTitle !== 'data_entry') {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user || user.jobTitle !== 'data_entry') {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('الرجاء إدخال اسم الزبون');
      return;
    }
    
    if (!formData.phone.trim()) {
      toast.error('الرجاء إدخال رقم الهاتف');
      return;
    }

    setIsSubmitting(true);
    try {
      const customerId = `customer_${Date.now()}`;
      const newCustomer = {
        id: customerId,
        transactionNumber: `TRX-${customerId.slice(-6).padStart(6, '0')}`,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || '',
        address: formData.address || '',
        idType: 'national_id' as const,
        registrationDate: new Date(),
        operationStatus: 'purchased' as const,
        documentStatus: 'cannot_deliver' as const,
        totalBalance: 0,
        totalTransactions: 0,
        createdBy: user?.fullName || 'Unknown',
        updatedAt: new Date(),
      };
      await addCustomer(newCustomer);

      setSuccessMessage('تم إضافة الزبون بنجاح!');
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

      toast.success('تم إضافة الزبون بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء إضافة الزبون');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Message */}
        {successMessage && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Add Customer Form - Main Content */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle>إضافة زبون جديد</CardTitle>
            <CardDescription>
              أدخل معلومات الزبون الجديد بشكل صحيح
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  اسم الزبون *
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="أدخل اسم الزبون"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  رقم الهاتف *
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="0920000000"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  البريد الإلكتروني
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Address Field */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  العنوان
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="أدخل عنوان الزبون"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'إضافة الزبون'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Alert */}
        <Alert className="mt-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            هذه الصفحة مخصصة فقط لإضافة زبائن جدد. يمكنك إضافة عدة زبائن متتاليين.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
