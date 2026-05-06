import { NotificationChannel } from '../enums/notification-channel.enum';

export interface AppNotification {
  id: string;
  userUid: string;
  channel: NotificationChannel;
  message: string;
  createdAt: string | null;
  read: boolean;
}

