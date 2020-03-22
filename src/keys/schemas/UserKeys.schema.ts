import * as mongoose from 'mongoose';
export const UserKeysSchema = new mongoose.Schema({
  user: String,
  name: String,
  exchangeID: String,
  publicK: String,
  privateK: String,
});

export interface UserKey extends mongoose.Document {
  user: string;
  name: string;
  exchangeID: string;
  publicK: string;
  privateK: string;
}
