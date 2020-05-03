import * as mongoose from 'mongoose';
export const PushNotificationSchema = new mongoose.Schema({
  user: String,
  endpoint: String,
  expirationTime: Number,
  keys: {},
});

export interface PushNotification extends mongoose.Document {
  user: string;
  endpoint: string;
  expirationTime: number;
  keys: any;
}

export interface PushNotificationWrapper {
  user: string;
  body: PushNotification;
}
