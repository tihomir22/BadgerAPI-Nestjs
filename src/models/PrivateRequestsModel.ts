export interface PrivateRequestsKeys {
  public: any;
  private: any;
}

export interface PrivateRequestsKeysWithExchange extends PrivateRequestsKeys {
  exchange: string;
}
