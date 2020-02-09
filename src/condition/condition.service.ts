import { Injectable, HttpException } from '@nestjs/common';
import { ConditionPack } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class ConditionService {
  constructor(
    @InjectModel('ConditionPack')
    private readonly conditionModel: Model<ConditionPack>,
  ) {}

  async guardarCondicion(condicion: ConditionPack) {
    if (
      condicion.conditionConfig &&
      condicion.indicatorConfig &&
      condicion.user
    ) {
      const createdCondition = new this.conditionModel({
        user: condicion.user,
        conditionConfig: condicion.conditionConfig,
        indicatorConfig: condicion.indicatorConfig,
      });
      return await createdCondition.save();
    } else {
      throw new HttpException('Incorrect condition configuration!', 404);
    }
  }
}
