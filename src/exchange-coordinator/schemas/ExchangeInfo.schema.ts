import * as mongoose from 'mongoose';

export const ExchangeInfoSchema = new mongoose.Schema({
  name: String,
  imageName: String,
  idExchange: String,
});

export interface ExchangeInfo {
  name: string;
  imageName: string;
  idExchange: string;
}
