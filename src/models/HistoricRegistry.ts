export interface HistoricRegistry {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime?: number;
  quoteVolume?: number;
  trades?: number;
  baseAssetVolume?: number;
  quoteAssetVolume?: number;
}
