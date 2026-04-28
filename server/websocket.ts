import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

interface ConnectedUser {
  userId: string;
  userName: string;
  socketId: string;
}

const connectedUsers = new Map<string, ConnectedUser>();

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL || '*'
        : ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  });

  // معالج الاتصال الجديد
  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] اتصال جديد: ${socket.id}`);

    // معالج تسجيل المستخدم
    socket.on('user_connected', (userData: { userId: string; userName: string }) => {
      connectedUsers.set(socket.id, {
        userId: userData.userId,
        userName: userData.userName,
        socketId: socket.id,
      });

      console.log(`[WebSocket] المستخدم متصل: ${userData.userName} (${userData.userId})`);
      console.log(`[WebSocket] عدد المستخدمين المتصلين: ${connectedUsers.size}`);

      // إرسال قائمة المستخدمين المتصلين
      io.emit('users_online', Array.from(connectedUsers.values()));
    });

    // معالج إضافة زبون جديد
    socket.on('customer_added', (event) => {
      console.log(`[WebSocket] إضافة زبون جديد من ${event.userName}:`, event.data.name);

      // بث الحدث لجميع المستخدمين الآخرين
      socket.broadcast.emit('customer_added', event);
    });

    // معالج تحديث بيانات زبون
    socket.on('customer_updated', (event) => {
      console.log(`[WebSocket] تحديث بيانات زبون من ${event.userName}:`, event.data.id);

      // بث الحدث لجميع المستخدمين الآخرين
      socket.broadcast.emit('customer_updated', event);
    });

    // معالج حذف زبون
    socket.on('customer_deleted', (event) => {
      console.log(`[WebSocket] حذف زبون من ${event.userName}:`, event.data.id);

      // بث الحدث لجميع المستخدمين الآخرين
      socket.broadcast.emit('customer_deleted', event);
    });

    // معالج إضافة بطاقة جديدة
    socket.on('card_added', (event) => {
      console.log(`[WebSocket] إضافة بطاقة جديدة من ${event.userName}`);

      // بث الحدث لجميع المستخدمين الآخرين
      socket.broadcast.emit('card_added', event);
    });

    // معالج تحديث بطاقة
    socket.on('card_updated', (event) => {
      console.log(`[WebSocket] تحديث بطاقة من ${event.userName}`);

      // بث الحدث لجميع المستخدمين الآخرين
      socket.broadcast.emit('card_updated', event);
    });

    // معالج قطع الاتصال
    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        connectedUsers.delete(socket.id);
        console.log(`[WebSocket] قطع الاتصال: ${user.userName} (${user.userId})`);
        console.log(`[WebSocket] عدد المستخدمين المتصلين: ${connectedUsers.size}`);

        // إرسال قائمة المستخدمين المتصلين المحدثة
        io.emit('users_online', Array.from(connectedUsers.values()));
      }
    });

    // معالج الأخطاء
    socket.on('error', (error) => {
      console.error(`[WebSocket] خطأ في الاتصال ${socket.id}:`, error);
    });
  });

  return io;
}

export function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

export function getUserCount() {
  return connectedUsers.size;
}
