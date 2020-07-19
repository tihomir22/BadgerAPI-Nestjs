import * as mongoose from 'mongoose';
import { PaqueteIndicadorTecnico, HistoricParams } from '../../models/PaqueteIndicadorTecnico';

export const executedTradePositionInfo = new mongoose.Schema({
  trade: {},
  exchange: String,
  status: String,
  metadata: {},
});
export const ConditionInfoSchema = new mongoose.Schema({
  user: String,
  conditionConfig: [{}],
  generalConfig: {},
});

export interface ConditionPack extends mongoose.Document {
  user: string;
  conditionConfig: Array<FullConditionsModel>;
  generalConfig: GeneralConfig;
}

export interface FullConditionsModel {
  id: any;
  type: 'Chained' | 'Basic';
  chainedTo: Array<number>;
  chainingColor: string;
  chainingType: 'AND' | 'OR';
  state?: 'started' | 'stopped';
  name: string;
  enter: EnterConditionModel;
  exit: ExitConditionModel;
  indicatorConfig: Array<PaqueteIndicadorTecnico>;
  isMainChainingNode: boolean;
}

export interface GeneralConfig {
  exchange: string;
  historicParams: HistoricParams;
}

export interface EnterConditionModel {
  activateWhen: 'below' | 'above' | 'equals';
  doWhat: string;
  value: number;
  dynamicValue: boolean;
}

export interface ExitConditionModel {
  typeExit: 'condition' | 'static';
  valueBasedOn: 'indicator' | 'price';
  value: any;
  closeWhen?: 'below' | 'above' | 'equals';
  takeProfitPercentage?: number;
  stopLossPercentage?: number;
}

export interface ChangeStateModel {
  id: number;
  state: 'started' | 'stopped';
}

export interface DeleteConditionsById {
  user: string;
  conditionsToDelete: Array<number>;
}

export interface ChangeFundingAsset {
  id: number;
  fundingAsset: string;
}
