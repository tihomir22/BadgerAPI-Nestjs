import { Injectable, HttpException } from '@nestjs/common';
import { ConditionPack } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import { ServerResponseIndicator, BacktestedConditionModel } from '../models/PaqueteIndicadorTecnico';

@Injectable()
export class ConditionService {
  constructor(
    @InjectModel('ConditionPack')
    private readonly conditionModel: Model<ConditionPack>,
    private exchangeCoordinator: ExchangeCoordinatorService,
    private indicatorService: TechnicalIndicatorsService,
  ) {}

  async guardarCondicion(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.indicatorConfig && condicion.user) {
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

  async backtestCondition(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.indicatorConfig && condicion.user) {
      // console.log(condicion);

      let indicatorData: BacktestedConditionModel = {
        fulfilled: [],
        extraData: await this.indicatorService.evaluateIndicator(
          condicion.indicatorConfig.indicatorParams,
          await (this.exchangeCoordinator.devolverHistoricoDependendiendoDelEXCHANGE(condicion.indicatorConfig) as any),
        ),
      };

      condicion.conditionConfig.forEach(condicion => {
        let detectadoCumplimiento = false;
        //Por cada condicion...
        for (let i = 0; i < indicatorData.extraData.technical.length; i++) {
          const registroTecnico = indicatorData.extraData.technical[i];

          switch (condicion.trigger) {
            case 'above':
              if (registroTecnico >= condicion.value) {
                detectadoCumplimiento = true;
              }
              break;
            case 'below':
              if (registroTecnico <= condicion.value) {
                detectadoCumplimiento = true;
              }
              break;
            case 'equals':
              if (registroTecnico === condicion.value) {
                detectadoCumplimiento = true;
              }
              break;
          }

          if (detectadoCumplimiento) {
            indicatorData.fulfilled[i] = true;
          } else {
            indicatorData.fulfilled[i] = false;
          }
          detectadoCumplimiento = false;
        }
      });
      return indicatorData;
    } else {
      throw new HttpException('Incorrect condition configuration!', 404);
    }
  }
}
