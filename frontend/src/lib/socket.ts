import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import type { Notification, InventoryItem } from '../types';

let socket: Socket | null = null;

export function connectSocket(userId: string, callbacks?: {
  onNotification?: (n: Notification) => void;
  onInventoryUpdate?: (item: InventoryItem) => void;
  onDoseReminder?: (data: { slot: string; patientId: string }) => void;
}) {
  if (socket?.connected) return socket;

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    socket?.emit('join', userId);
  });

  socket.on('notification', (notification: Notification) => {
    toast(notification.title || 'New Notification', {
      icon: '🔔',
      duration: 5000,
    });
    callbacks?.onNotification?.(notification);
  });

  socket.on('inventory:update', (item: InventoryItem) => {
    callbacks?.onInventoryUpdate?.(item);
  });

  socket.on('dose:reminder', (data: { slot: string; patientId: string }) => {
    toast(`Time for your ${data.slot} medicines!`, { icon: '💊', duration: 8000 });
    callbacks?.onDoseReminder?.(data);
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
