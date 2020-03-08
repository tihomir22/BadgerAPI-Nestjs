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
  fulfilled: Array<FullfillmentModel>;
  extraData: ServerResponseIndicator;
}

export interface FullfillmentModel {
  id: any;
  priceEnter: number;
  indicatorEnter: number;
  dateEnter: Date;
  priceExit: number;
  indicatorExit: number;
  dateExit: Date;
}

export interface ServerResponseIndicator {
  historic: Array<HistoricRegistry>;
  technical: Array<number>;
}
