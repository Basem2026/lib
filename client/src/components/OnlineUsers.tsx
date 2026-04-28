import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff, Clock } from 'lucide-react';

interface OnlineUser {
  userId: string;
  userName: string;
  socketId: string;
  connectedAt?: number;
}

export function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // الاتصال بـ WebSocket
    const newSocket = io(window.location.origin, {
      path: '/socket.io/',
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('users_online', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const getStatusColor = (index: number) => {
    const colors = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
    ];
    return colors[index % colors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'الآن';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} يوم`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <div>
              <CardTitle className="text-lg">الموظفون المتصلون</CardTitle>
              <CardDescription>
                {onlineUsers.length} موظف متصل حالياً
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600 font-medium">متصل</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600 font-medium">غير متصل</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {onlineUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>لا يوجد موظفون متصلون حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlineUsers.map((user, index) => (
              <div
                key={user.socketId}
                className={`p-3 rounded-lg border flex items-center gap-3 ${getStatusColor(index)}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white bg-opacity-50 flex items-center justify-center font-semibold text-sm">
                    {getInitials(user.userName)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.userName}</p>
                  <div className="flex items-center gap-1 text-xs opacity-75">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(user.connectedAt)}</span>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-50">
                    <span className="w-2 h-2 rounded-full bg-green-600"></span>
                    نشط
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
