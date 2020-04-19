export interface BaseBinanceModel {
  keys: PrivateRequestsKeys;
  params?: any;
}

export interface PrivateRequestsKeys {
  public: any;
  private: any;
}

export interface PrivateRequestsKeysWithExchange extends PrivateRequestsKeys {
  exchange: string;
}

export interface PrivateRequestsKeysWithSymbol extends PrivateRequestsKeys {
  symbol: string;
}
export interface PrivateRequestsKeysWithDualSidePosition extends PrivateRequestsKeys {
  dualSidePosition: 'true' | 'false';
}

export interface PrivateRequestsKeysWithSymbolAndOrderId extends PrivateRequestsKeys {
  symbol: string;
  orderId: number;
}

export interface NewOrderModel extends PrivateRequestsKeysWithSymbol {
  side: 'BUY' | 'SELL';
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  type: 'LIMIT' | 'MARKET' | 'STOP/TAKE_PROFIT' | 'STOP_MARKET/TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
  quantity: number;
  timestamp: number;
  newClientOrderId?: string;
}
