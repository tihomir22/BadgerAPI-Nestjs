import * as mongoose from 'mongoose';
import { PaqueteIndicadorTecnico } from 'src/models/PaqueteIndicadorTecnico';

export const ConditionInfoSchema = new mongoose.Schema({
  user: String,
  conditionConfig: [{}],
  indicatorConfig: {},
});

export interface ConditionPack {
  user: string;
  conditionConfig: Array<ConditionParams>;
  indicatorConfig: PaqueteIndicadorTecnico;
}

export interface ConditionParams {
  trigger: string;
  event: string;
  value: any;
}
