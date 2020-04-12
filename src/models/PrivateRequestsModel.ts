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
export interface PrivateRequestsKeysWithSymbolAndOrderId extends PrivateRequestsKeys {
  symbol: string;
  orderId: number;
}
