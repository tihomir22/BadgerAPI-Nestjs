import * as mongoose from 'mongoose';
import { PaqueteIndicadorTecnico } from 'src/models/PaqueteIndicadorTecnico';

export const ConditionInfoSchema = new mongoose.Schema({
  user: String,
  conditionConfig: [{}],
  indicatorConfig: {},
});

export const executedTradePositionInfo = new mongoose.Schema({
  trade: {},
  exchange: String,
  status: String,
  metadata: {},
});

export interface ConditionPack extends mongoose.Document {
  user: string;
  conditionConfig: Array<FullConditionsModel>;
  indicatorConfig: PaqueteIndicadorTecnico;
}

export interface FullConditionsModel {
  id: number;
  name: string;
  state?: 'started' | 'stopped';
  enter: EnterConditionModel;
  exit: ExitConditionModel;
}

export interface EnterConditionModel {
  activateWhen: 'below' | 'above' | 'equals';
  doWhat: string;
  value: number;
}

export interface ExitConditionModel {
  typeExit: 'indicator' | 'price';
  closeWhen: 'below' | 'above' | 'equals';
  value: number;
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
