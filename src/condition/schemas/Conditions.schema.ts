import * as mongoose from 'mongoose';
import { PaqueteIndicadorTecnico } from 'src/models/PaqueteIndicadorTecnico';

export const ConditionInfoSchema = new mongoose.Schema({
  user: String,
  conditionConfig: [{}],
  indicatorConfig: {},
});

export interface ConditionPack {
  user: string;
  conditionConfig: Array<FullConditionsModel>;
  indicatorConfig: PaqueteIndicadorTecnico;
}

export interface FullConditionsModel {
  name: string;
  enter: EnterConditionModel;
  exit: ExitConditionModel;
}

export interface EnterConditionModel {
  activateWhen: string;
  doWhat: string;
  value: any;
}

export interface ExitConditionModel {
  closeWhen: string;
  value: any;
}
