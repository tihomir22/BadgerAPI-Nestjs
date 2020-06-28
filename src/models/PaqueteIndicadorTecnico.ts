import { HistoricRegistry } from './HistoricRegistry';
import { FullConditionsModel } from '../condition/schemas/Conditions.schema';

export interface PaqueteIndicadorTecnico {
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
  conditionAssociated: FullConditionsModel;
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
  technical: Array<Array<number>>;
}
