import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, FolderOpen, Bell, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';

type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface Permission {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: PermissionStatus;
  required: boolean;
}

const STORAGE_KEY = 'app_permissions_setup_done';

/**
 * شاشة طلب الأذونات عند أول تشغيل للتطبيق
 * تظهر مرة واحدة فقط وتحفظ الحالة في localStorage
 */
export function PermissionsSetup({ onComplete }: { onComplete: () => void }) {
  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'camera',
      label: 'الكاميرا',
      description: 'لمسح الباركود وتصوير البطاقات',
      icon: <Camera className="w-6 h-6" />,
      status: 'idle',
      required: true,
    },
    {
      id: 'files',
      label: 'الملفات والصور',
      description: 'لرفع المستندات والصور',
      icon: <FolderOpen className="w-6 h-6" />,
      status: 'idle',
      required: false,
    },
    {
      id: 'notifications',
      label: 'الإشعارات',
      description: 'لتلقي تنبيهات البطاقات المنتهية',
      icon: <Bell className="w-6 h-6" />,
      status: 'idle',
      required: false,
    },
  ]);

  const [allDone, setAllDone] = useState(false);
  const [isRequestingAll, setIsRequestingAll] = useState(false);

  // فحص الأذونات الحالية عند التحميل
  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    const updates: Partial<Record<string, PermissionStatus>> = {};

    // فحص الكاميرا
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      if (cam.state === 'granted') updates['camera'] = 'granted';
      else if (cam.state === 'denied') updates['camera'] = 'denied';
    } catch {
      // بعض المتصفحات لا تدعم query للكاميرا
    }

    // فحص الإشعارات
    if ('Notification' in window) {
      if (Notification.permission === 'granted') updates['notifications'] = 'granted';
      else if (Notification.permission === 'denied') updates['notifications'] = 'denied';
    } else {
      updates['notifications'] = 'unavailable';
    }

    // الملفات لا يمكن فحصها مسبقاً - تُطلب عند الاستخدام
    // نعتبرها متاحة دائماً على الويب

    setPermissions(prev => prev.map(p => ({
      ...p,
      status: updates[p.id] ?? p.status,
    })));
  };

  const requestPermission = async (id: string) => {
    setPermissions(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'requesting' } : p
    ));

    let status: PermissionStatus = 'denied';

    try {
      if (id === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop()); // إيقاف فوري بعد الحصول على الإذن
        status = 'granted';
      } else if (id === 'notifications') {
        if (!('Notification' in window)) {
          status = 'unavailable';
        } else {
          const result = await Notification.requestPermission();
          status = result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'idle';
        }
      } else if (id === 'files') {
        // الملفات على الويب لا تحتاج إذن مسبق - نعتبرها ممنوحة
        status = 'granted';
      }
    } catch {
      status = 'denied';
    }

    setPermissions(prev => prev.map(p =>
      p.id === id ? { ...p, status } : p
    ));
  };

  const requestAll = async () => {
    setIsRequestingAll(true);
    for (const perm of permissions) {
      if (perm.status === 'idle') {
        await requestPermission(perm.id);
        await new Promise(r => setTimeout(r, 300)); // تأخير بسيط بين الطلبات
      }
    }
    setIsRequestingAll(false);
    setAllDone(true);
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onComplete();
  };

  const getStatusIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'denied': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'unavailable': return <XCircle className="w-5 h-5 text-gray-400" />;
      case 'requesting': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusText = (status: PermissionStatus) => {
    switch (status) {
      case 'granted': return 'تم السماح';
      case 'denied': return 'مرفوض';
      case 'unavailable': return 'غير متاح';
      case 'requesting': return 'جاري الطلب...';
      default: return 'لم يُطلب بعد';
    }
  };

  const requiredGranted = permissions
    .filter(p => p.required)
    .every(p => p.status === 'granted');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4 text-center" style={{ backgroundColor: '#1E2E3D' }}>
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#C9A34D' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-1">أذونات التطبيق</h2>
          <p className="text-sm" style={{ color: '#DCE3EA' }}>
            نحتاج إذنك لبعض الميزات لتعمل بشكل صحيح
          </p>
        </div>

        {/* قائمة الأذونات */}
        <div className="px-6 py-4 space-y-3">
          {permissions.map(perm => (
            <div
              key={perm.id}
              className="flex items-center gap-3 p-3 rounded-xl border"
              style={{
                borderColor: perm.status === 'granted' ? '#86efac' : perm.status === 'denied' ? '#fca5a5' : '#E5E7EB',
                backgroundColor: perm.status === 'granted' ? '#f0fdf4' : perm.status === 'denied' ? '#fef2f2' : '#F9FAFB',
              }}
            >
              {/* أيقونة */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#1E2E3D', color: '#C9A34D' }}
              >
                {perm.icon}
              </div>

              {/* النص */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-sm" style={{ color: '#1E2E3D' }}>{perm.label}</span>
                  {perm.required && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: '#C9A34D' }}>
                      مطلوب
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{perm.description}</p>
                <p className="text-xs mt-0.5 font-medium" style={{
                  color: perm.status === 'granted' ? '#16a34a' : perm.status === 'denied' ? '#dc2626' : '#6B7280'
                }}>
                  {getStatusText(perm.status)}
                </p>
              </div>

              {/* حالة الإذن */}
              <div className="flex-shrink-0">
                {perm.status === 'idle' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestPermission(perm.id)}
                    className="text-xs h-7 px-2"
                  >
                    طلب
                  </Button>
                ) : (
                  getStatusIcon(perm.status)
                )}
              </div>
            </div>
          ))}
        </div>

        {/* أزرار */}
        <div className="px-6 pb-6 space-y-2">
          {!allDone && (
            <Button
              className="w-full text-white font-semibold"
              style={{ backgroundColor: '#1E2E3D' }}
              onClick={requestAll}
              disabled={isRequestingAll}
            >
              {isRequestingAll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  جاري طلب الأذونات...
                </>
              ) : (
                'السماح بجميع الأذونات'
              )}
            </Button>
          )}

          <Button
            className="w-full font-semibold"
            style={{
              backgroundColor: requiredGranted || allDone ? '#C9A34D' : '#F3F4F6',
              color: requiredGranted || allDone ? '#FFFFFF' : '#9CA3AF',
            }}
            onClick={handleComplete}
            disabled={!requiredGranted && !allDone}
          >
            {requiredGranted || allDone ? 'ابدأ الاستخدام' : 'يرجى السماح بالكاميرا أولاً'}
          </Button>

          {!requiredGranted && (
            <button
              className="w-full text-xs text-gray-400 underline py-1"
              onClick={handleComplete}
            >
              تخطي الآن (بعض الميزات لن تعمل)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook لفحص ما إذا كانت شاشة الأذونات يجب أن تظهر
 */
export function usePermissionsSetup() {
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // تأخير بسيط لإعطاء التطبيق وقت للتحميل
      const timer = setTimeout(() => setShowSetup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeSetup = () => setShowSetup(false);

  return { showSetup, completeSetup };
}
