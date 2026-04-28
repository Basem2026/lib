import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Bell, Camera, CheckCircle2 } from "lucide-react";
import { notificationManager } from "@/lib/notificationManager";

interface PermissionsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PermissionsDialog({ open, onClose }: PermissionsDialogProps) {
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [cameraGranted, setCameraGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestPermissions = async () => {
    setLoading(true);
    
    try {
      const permissions = await notificationManager.requestAllPermissions();
      
      setNotificationGranted(permissions.notifications === 'granted');
      setCameraGranted(permissions.camera);
      
      // Show test notification
      if (permissions.notifications === 'granted') {
        await notificationManager.showNotification(
          '✅ تم تفعيل الإشعارات',
          {
            body: 'ستصلك الإشعارات الآن عند إضافة زبون جديد أو أي عملية مهمة',
            sound: true,
          }
        );
      }
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error requesting permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🔔 تفعيل الإشعارات</DialogTitle>
          <DialogDescription className="text-center text-base">
            للحصول على تجربة أفضل، نحتاج إلى بعض الأذونات
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">الإشعارات</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                ستصلك إشعارات فورية عند إضافة زبون جديد أو أي عملية مهمة
              </p>
              {notificationGranted && (
                <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">تم التفعيل</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <Camera className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">الكاميرا</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                لمسح البطاقات والمستندات بسهولة
              </p>
              {cameraGranted && (
                <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">تم التفعيل</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            لاحقاً
          </Button>
          <Button
            onClick={handleRequestPermissions}
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'جاري التفعيل...' : 'تفعيل الآن'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
