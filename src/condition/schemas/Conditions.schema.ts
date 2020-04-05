import * as mongoose from 'mongoose';
import { PaqueteIndicadorTecnico } from 'src/models/PaqueteIndicadorTecnico';

export const ConditionInfoSchema = new mongoose.Schema({
  user: String,
  conditionConfig: [{}],
  indicatorConfig: {},
});

export interface ConditionPack extends mongoose.Document {
  user: string;
  conditionConfig: Array<FullConditionsModel>;
  indicatorConfig: PaqueteIndicadorTecnico;
}

export interface FullConditionsModel {
  name: string;
  state?: 'started' | 'stopped';
  fundingAsset?: string;
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

export interface ChangeFundingAsset {
  id: number;
  fundingAsset: string;
}
