import * as mongoose from 'mongoose';

export const ExchangeInfoSchema = new mongoose.Schema({
  name: String,
  imageName: String,
  img: {
    data: Buffer,
    contentType: String,
  },
});

export interface ExchangeInfo {
  name: string;
  imageName: string;
  img: any;
}
