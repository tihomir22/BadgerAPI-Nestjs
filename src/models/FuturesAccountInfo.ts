export interface FuturesAccountInfo {
  listaAssets: Array<AssetFuture>;
}

export interface AssetFuture {
  accountAlias: string;
  asset: string;
  balance: string;
  withdrawAvailable: string;
  updateTime: number;
}
