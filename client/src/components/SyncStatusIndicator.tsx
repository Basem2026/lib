/**
 * مكون SyncStatusIndicator
 * يعرض حالة المزامنة الفورية في الواجهة
 * - نقطة خضراء متحركة: متصل ومزامن
 * - نقطة صفراء: يحاول الاتصال
 * - نقطة رمادية: غير متصل (يعمل بـ polling)
 */
import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type SyncStatus = 'connected' | 'connecting' | 'disconnected' | 'syncing';

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>('connecting');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeClients, setActiveClients] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let attempts = 0;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStatus('connecting');

      try {
        const es = new EventSource('/api/sync/events');
        eventSourceRef.current = es;

        es.onopen = () => {
          setStatus('connected');
          setLastSync(new Date());
          attempts = 0;
          
          // جلب عدد المتصلين
          fetch('/api/sync/status')
            .then(r => r.json())
            .then(data => setActiveClients(data.activeClients))
            .catch(() => {});
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type !== 'connected') {
              // حدث مزامنة وارد
              setStatus('syncing');
              setLastSync(new Date());
              setTimeout(() => setStatus('connected'), 1000);
            }
          } catch {}
        };

        es.onerror = () => {
          setStatus('disconnected');
          es.close();
          eventSourceRef.current = null;

          // إعادة المحاولة
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 30000);
          attempts++;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };
      } catch {
        setStatus('disconnected');
      }
    };

    connect();

    // تحديث عدد المتصلين كل 30 ثانية
    const interval = setInterval(() => {
      if (status === 'connected') {
        fetch('/api/sync/status')
          .then(r => r.json())
          .then(data => setActiveClients(data.activeClients))
          .catch(() => {});
      }
    }, 30000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'syncing': return 'bg-blue-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return `متصل ومزامن${activeClients > 1 ? ` (${activeClients} مستخدم نشط)` : ''}`;
      case 'syncing': return 'جارٍ المزامنة...';
      case 'connecting': return 'جارٍ الاتصال...';
      case 'disconnected': return 'غير متصل (تحديث كل ثانيتين)';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'connected': return <Wifi className="w-3 h-3" />;
      case 'syncing': return <RefreshCw className="w-3 h-3 animate-spin" />;
      case 'connecting': return <Wifi className="w-3 h-3 opacity-50" />;
      case 'disconnected': return <WifiOff className="w-3 h-3" />;
    }
  };

  const formatLastSync = () => {
    if (!lastSync) return '';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSync.getTime()) / 1000);
    if (diff < 60) return `منذ ${diff} ث`;
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
    return lastSync.toLocaleTimeString('ar');
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default select-none">
          {/* نقطة الحالة */}
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${
              status === 'connected' ? 'animate-pulse' : 
              status === 'syncing' ? 'animate-ping' : ''
            }`} />
            {status === 'connected' && (
              <div className={`absolute inset-0 w-2 h-2 rounded-full ${getStatusColor()} opacity-30 animate-ping`} />
            )}
          </div>
          {/* أيقونة */}
          <span className={`${
            status === 'connected' ? 'text-green-600' :
            status === 'syncing' ? 'text-blue-600' :
            status === 'connecting' ? 'text-yellow-600' :
            'text-gray-400'
          }`}>
            {getIcon()}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{getStatusText()}</p>
          {lastSync && (
            <p className="text-muted-foreground">آخر مزامنة: {formatLastSync()}</p>
          )}
          <p className="text-muted-foreground text-xs">
            {status === 'connected' 
              ? 'المزامنة الفورية نشطة - التغييرات تظهر فوراً'
              : 'يعمل بالتحديث التلقائي كل ثانيتين'}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
