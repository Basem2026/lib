// Notification Manager for PWA
export class NotificationManager {
  private static instance: NotificationManager;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  // Register service worker
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // Request camera permission
  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  // Show notification with sound
  async showNotification(title: string, options: {
    body: string;
    icon?: string;
    badge?: string;
    sound?: boolean;
  }): Promise<void> {
    const permission = await this.requestNotificationPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
      body: options.body,
      icon: options.icon || 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/wbRRrvpIaECITfjE.png',
      badge: options.badge || 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663215657361/wbRRrvpIaECITfjE.png',
      vibrate: [200, 100, 200],
      tag: 'notification-' + Date.now(),
      requireInteraction: false,
      silent: false,
    };

    // Play sound if requested
    if (options.sound !== false) {
      this.playNotificationSound();
    }

    if (this.registration) {
      await this.registration.showNotification(title, notificationOptions);
    } else {
      new Notification(title, notificationOptions);
    }
  }

  // Play notification sound
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.warn('Could not play notification sound:', err));
    } catch (error) {
      console.warn('Notification sound not available:', error);
    }
  }

  // Request all permissions at once
  async requestAllPermissions(): Promise<{
    notifications: NotificationPermission;
    camera: boolean;
  }> {
    const notifications = await this.requestNotificationPermission();
    const camera = await this.requestCameraPermission();
    
    return { notifications, camera };
  }
}

export const notificationManager = NotificationManager.getInstance();
