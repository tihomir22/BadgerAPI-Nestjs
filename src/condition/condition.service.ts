import { Injectable, HttpException } from '@nestjs/common';
import { ConditionPack, FullConditionsModel } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import { ServerResponseIndicator, BacktestedConditionModel } from '../models/PaqueteIndicadorTecnico';
import { clone } from 'lodash';

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
        let res: Array<any> = this.detectIfConditionAccomplished(condicion, indicatorData);
        condicion = res[0];
        indicatorData = res[1];
      });

      condicion.conditionConfig.forEach(condicion => {
        let res: Array<any> = this.detectIfAccomplishedConditionHasEnded(condicion, indicatorData);
        condicion = res[0];
        indicatorData = res[1];
      });

      return indicatorData;
    } else {
      throw new HttpException('Incorrect condition configuration!', 404);
    }
  }

  private closeAllEntriesBeforeThisIndex(
    index: number,
    technicalData: BacktestedConditionModel,
    closeTime: Date,
    indicatorExitoValue: number,
    priceExitValue: number,
  ) {
    for (let i = index; i > 0; i--) {
      let element = technicalData.fulfilled[i];
      if (element) {
        if (element.dateExit != null || element.indicatorExit != null || element.priceExit != null) {
          break;
        }
        element.dateExit = closeTime;
        element.indicatorExit = indicatorExitoValue;
        element.priceExit = priceExitValue;
      }
    }
  }

  private detectIfAccomplishedConditionHasEnded(condicion: FullConditionsModel, technicalData: BacktestedConditionModel): Array<any> {
    if (condicion.exit && condicion.exit.closeWhen && condicion.exit.value) {
      for (let i = 0; i < technicalData.extraData.technical.length; i++) {
        if (technicalData.extraData.technical[i] != null) {
          switch (condicion.exit.closeWhen) {
            case 'above':
              if (condicion.exit.typeExit == 'indicator') {
                if (technicalData.extraData.technical[i] >= condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              } else if (condicion.exit.typeExit == 'price') {
                if (technicalData.extraData.historic[i].close >= condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              }
              break;

            case 'below':
              if (condicion.exit.typeExit == 'indicator') {
                if (technicalData.extraData.technical[i] <= condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              } else if (condicion.exit.typeExit == 'price') {
                if (technicalData.extraData.historic[i].close <= condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              }
            case 'equals':
              if (condicion.exit.typeExit == 'indicator') {
                if (technicalData.extraData.technical[i] === condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              } else if (condicion.exit.typeExit == 'price') {
                if (technicalData.extraData.historic[i].close === condicion.exit.value) {
                  this.closeAllEntriesBeforeThisIndex(
                    i,
                    technicalData,
                    new Date(technicalData.extraData.historic[i].closeTime),
                    technicalData.extraData.technical[i],
                    technicalData.extraData.historic[i].close,
                  );
                }
              }
              break;
          }
        }
      }
    }
    return [condicion, technicalData];
  }

  private detectIfConditionAccomplished(condicion: FullConditionsModel, technicalData: BacktestedConditionModel): Array<any> {
    let detectadoCumplimiento = false;
    let seEstaCumpliendoLaCondicion = false;
    //Por cada condicion...
    for (let i = 0; i < technicalData.extraData.technical.length; i++) {
      const registroTecnico = technicalData.extraData.technical[i];
      if (registroTecnico != null) {
        switch (condicion.enter.activateWhen) {
          case 'above':
            if (registroTecnico >= condicion.enter.value) {
              detectadoCumplimiento = true;
            }
            break;
          case 'below':
            if (registroTecnico <= condicion.enter.value) {
              detectadoCumplimiento = true;
            }
            break;
          case 'equals':
            if (registroTecnico === condicion.enter.value) {
              detectadoCumplimiento = true;
            }
            break;
        }

        let resdetectIfConditionAccomplishmentEnded: Array<any> = this.detectIfConditionAccomplishmentEnded(
          detectadoCumplimiento,
          seEstaCumpliendoLaCondicion,
        );
        detectadoCumplimiento = resdetectIfConditionAccomplishmentEnded[0];
        seEstaCumpliendoLaCondicion = resdetectIfConditionAccomplishmentEnded[1];
        if (detectadoCumplimiento && registroTecnico != null) {
          technicalData.fulfilled[i] = {
            id: +new Date() + 'CDN',
            priceEnter: technicalData.extraData.historic[i].close,
            indicatorEnter: registroTecnico,
            dateEnter: new Date(technicalData.extraData.historic[i].openTime),
            priceExit: null,
            indicatorExit: null,
            dateExit: null,
          };
        } else {
          technicalData.fulfilled[i] = null;
        }
        detectadoCumplimiento = false;
      } else {
        technicalData.fulfilled[i] = null;
      }
    }

    return [condicion, technicalData];
  }

  private detectIfConditionAccomplishmentEnded(detectadoCumplimiento: boolean, seEstaCumpliendoLaCondicion: boolean): Array<any> {
    if (detectadoCumplimiento && !seEstaCumpliendoLaCondicion) {
      seEstaCumpliendoLaCondicion = true;
    } else if (seEstaCumpliendoLaCondicion && detectadoCumplimiento) {
      detectadoCumplimiento = false;
    } else if (seEstaCumpliendoLaCondicion && !detectadoCumplimiento) {
      seEstaCumpliendoLaCondicion = false;
    }
    return [detectadoCumplimiento, seEstaCumpliendoLaCondicion];
  }
}
