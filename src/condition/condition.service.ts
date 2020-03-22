import { Injectable, HttpException } from '@nestjs/common';
import { FullConditionsModel, ConditionPack } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import { ServerResponseIndicator, BacktestedConditionModel } from '../models/PaqueteIndicadorTecnico';
import { clone } from 'lodash';
import { HistoricRegistry } from 'src/models/HistoricRegistry';

@Injectable()
export class ConditionService {
  constructor(
    @InjectModel('ConditionPack') private conditionModel: Model<ConditionPack>,
    private exchangeCoordinator: ExchangeCoordinatorService,
    private indicatorService: TechnicalIndicatorsService,
  ) {}

  async recoverAllConditionsByUserId(encondedUserID: any) {
    return await this.conditionModel.find({ user: decodeURIComponent(encondedUserID) }).exec();
  }

  async returnAll() {
    return await this.conditionModel.find();
  }

  async returnConditionsByTimeFrame(
    timeFrame: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M',
  ) {
    return await this.conditionModel.find({ 'indicatorConfig.historicParams.interval': timeFrame });
  }

  async changeState(encondedConditionId: any, conditionState: string) {
    let id = Number.parseInt(encondedConditionId);
    let state = conditionState;
    if (state == 'started' || state == 'stopped') {
      return await this.conditionModel.findOneAndUpdate(
        {
          'conditionConfig.id': id,
        },
        {
          $set: {
            'conditionConfig.$.state': state,
          },
        },
      );
    } else {
      throw new HttpException(`Non valid condition state ${state}`, 400);
    }
  }

  async guardarCondicion(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.indicatorConfig && condicion.user) {
      const createdCondition = new this.conditionModel({
        user: condicion.user,
        conditionConfig: condicion.conditionConfig,
        indicatorConfig: condicion.indicatorConfig,
      });
      return await createdCondition.save();
    } else {
      throw new HttpException('Incorrect condition configuration!', 400);
    }
  }

  async getLatestTechnicalAndHistoricDataFromCondition(condicion: ConditionPack): Promise<BacktestedConditionModel> {
    return {
      fulfilled: [],
      extraData: await this.indicatorService.evaluateIndicator(
        condicion.indicatorConfig.indicatorParams,
        await (this.exchangeCoordinator.devolverHistoricoDependendiendoDelEXCHANGE(condicion.indicatorConfig) as any),
      ),
    };
  }

  async backtestCondition(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.indicatorConfig && condicion.user) {
      let indicatorData: BacktestedConditionModel = await this.getLatestTechnicalAndHistoricDataFromCondition(condicion);

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

  public detectIfConditionIsAccomplishedWithSingleEntry(
    condicion: FullConditionsModel,
    technicalEntry: number,
    detectadoCumplimiento: boolean,
  ) {
    switch (condicion.enter.activateWhen) {
      case 'above':
        if (technicalEntry >= condicion.enter.value) {
          detectadoCumplimiento = true;
        }
        break;
      case 'below':
        if (technicalEntry <= condicion.enter.value) {
          detectadoCumplimiento = true;
        }
        break;
      case 'equals':
        if (technicalEntry === condicion.enter.value) {
          detectadoCumplimiento = true;
        }
        break;
    }
    return detectadoCumplimiento;
  }

  private detectIfConditionAccomplished(condicion: FullConditionsModel, technicalData: BacktestedConditionModel): Array<any> {
    let detectadoCumplimiento = false;
    let seEstaCumpliendoLaCondicion = false;
    //Por cada condicion...
    for (let i = 0; i < technicalData.extraData.technical.length; i++) {
      const registroTecnico = technicalData.extraData.technical[i];
      if (registroTecnico != null) {
        detectadoCumplimiento = this.detectIfConditionIsAccomplishedWithSingleEntry(condicion, registroTecnico, detectadoCumplimiento);
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
