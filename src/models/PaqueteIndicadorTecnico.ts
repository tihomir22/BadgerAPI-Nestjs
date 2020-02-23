import { HistoricRegistry } from './HistoricRegistry';

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

export interface BacktestedConditionModel {
  fulfilled: Array<boolean>;
  extraData: ServerResponseIndicator;
}

export interface ServerResponseIndicator {
  historic: Array<HistoricRegistry>;
  technical: Array<number>;
}
