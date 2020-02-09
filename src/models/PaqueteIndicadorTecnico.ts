export interface PaqueteIndicadorTecnico {
  exchange: string;
  historicParams: HistoricParams;
  indicatorParams: IndicatorParams;
}

export interface HistoricParams {
  symbol: string;
  interval: any;
  limit: number;
}

export interface IndicatorParams {
  indicatorName: string;
  keysNeeded: Array<string>;
  includeHistoric: boolean;
  indicatorParams: Array<any>;
}

