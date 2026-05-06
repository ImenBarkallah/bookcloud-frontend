import { NotificationChannel } from '../enums/notification-channel.enum';

export interface CreateAppNotificationRequestDto {
  userUid: string;
  channel?: NotificationChannel;
  message: string;
}

