import * as mongoose from 'mongoose';
export const UserKeysSchema = new mongoose.Schema({
  user: String,
  name: String,
  exchangeID: String,
  publicK: String,
  privateK: String,
  isTestnet: Boolean,
  defaultKey: Boolean,
});

export interface UserKey extends mongoose.Document {
  user: string;
  name: string;
  exchangeID: string;
  publicK: string;
  privateK: string;
  isTestnet: boolean;
  defaultKey: boolean;
}

export interface JustKeys {
  publicK: string;
  privateK: string;
}

export interface GetAccountInfoModel {
  exchange: string;
  private: string;
  public: string;
  isTestnet: boolean;
}
