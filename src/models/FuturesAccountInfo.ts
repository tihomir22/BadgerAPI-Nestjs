import * as mongoose from 'mongoose';
export interface FuturesAccountInfo {
  accountAlias: string;
  asset: string;
  balance: string;
  withdrawAvailable: string;
  updateTime: number;
}

export interface WrapperSchemaFuturesOrderInfo extends mongoose.Document {
  trade: FuturesOrderInfo;
  status: 'abierto' | 'cerrado';
  exchange: string;
}

export interface FuturesOrderInfo {
  orderId: number;
  symbol: string;
  status: string;
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  cumQty: string;
  cumQuote: string;
  timeInForce: string;
  type: string;
  reduceOnly: boolean;
  side: string;
  positionSide: string;
  stopPrice: string;
  workingType: string;
  origType: string;
  updateTime: number;
}
