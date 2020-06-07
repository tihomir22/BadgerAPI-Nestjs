import { Injectable, HttpException } from '@nestjs/common';
import { FullConditionsModel, ConditionPack, DeleteConditionsById } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import { ServerResponseIndicator, BacktestedConditionModel } from '../models/PaqueteIndicadorTecnico';
import { clone, cloneDeep } from 'lodash';
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

  async deleteConditionsById(conditionsPack: DeleteConditionsById) {
    let resBusqueda = await this.conditionModel.find({ user: conditionsPack.user });
    resBusqueda.forEach(condicionPack => {
      let condicionesFiltradas = [];

      condicionPack.conditionConfig.forEach(condicion => {
        let idAnalizadoActualSubcondicion = conditionsPack.conditionsToDelete.indexOf(condicion.id);
        if (idAnalizadoActualSubcondicion == -1) {
          condicionesFiltradas.push(condicion);
        }
      });
      if (condicionPack.conditionConfig.length != condicionesFiltradas.length) {
        condicionPack.conditionConfig = cloneDeep(condicionesFiltradas);
        condicionPack.save();
      }

      condicionesFiltradas = [];
    });
  }

  async changeFundingAsset(encondedConditionId: any, fundingAsset: string) {
    let id = Number.parseInt(encondedConditionId);
    return await this.conditionModel.findOneAndUpdate(
      {
        'conditionConfig.id': id,
      },
      {
        $set: {
          'conditionConfig.$.fundingAsset': fundingAsset,
        },
      },
    );
  }

  async guardarCondicion(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.conditionConfig.every(entry => entry.indicatorConfig) && condicion.user) {
      const createdCondition: ConditionPack = new this.conditionModel({
        user: condicion.user,
        conditionConfig: condicion.conditionConfig,
        generalConfig: condicion.generalConfig,
      });
      return await createdCondition.save();
    } else {
      throw new HttpException('Incorrect condition configuration!', 400);
    }
  }

  async getLatestTechnicalAndHistoricDataFromCondition(condicion: ConditionPack): Promise<BacktestedConditionModel> {
    //=>STATIC<=
    return {
      fulfilled: [],
      extraData: await this.indicatorService.evaluateIndicator(
        condicion.conditionConfig[0].indicatorConfig[0].indicatorParams,
        await (this.exchangeCoordinator.devolverHistoricoDependendiendoDelEXCHANGE(condicion.generalConfig) as any),
      ),
    };
  }

  async backtestCondition(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.conditionConfig.every(entry => entry.indicatorConfig) && condicion.user) {
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
      technicalData.extraData.technical.forEach(technicalEntryData => {
        for (let i = 0; i < technicalEntryData.length; i++) {
          if (technicalEntryData[i] != null) {
            switch (condicion.exit.closeWhen) {
              case 'above':
                if (condicion.exit.typeExit == 'indicator') {
                  if (technicalEntryData[i] >= condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                } else if (condicion.exit.typeExit == 'price') {
                  if (technicalData.extraData.historic[i].close >= condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                }
                break;

              case 'below':
                if (condicion.exit.typeExit == 'indicator') {
                  if (technicalEntryData[i] <= condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                } else if (condicion.exit.typeExit == 'price') {
                  if (technicalData.extraData.historic[i].close <= condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                }
              case 'equals':
                if (condicion.exit.typeExit == 'indicator') {
                  if (technicalEntryData[i] === condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                } else if (condicion.exit.typeExit == 'price') {
                  if (technicalData.extraData.historic[i].close === condicion.exit.value) {
                    this.closeAllEntriesBeforeThisIndex(
                      i,
                      technicalData,
                      new Date(technicalData.extraData.historic[i].closeTime),
                      technicalEntryData[i],
                      technicalData.extraData.historic[i].close,
                    );
                  }
                }
                break;
            }
          }
        }
      });
    }
    return [condicion, technicalData];
  }

  public detectIfConditionIsAccomplishedWithSingleEntry(activateWhen: 'below' | 'above' | 'equals', value: any, technicalEntry: number) {
    let res = false;
    switch (activateWhen) {
      case 'above':
        if (technicalEntry >= value) {
          res = true;
        }
        break;
      case 'below':
        if (technicalEntry <= value) {
          res = true;
        }
        break;
      case 'equals':
        if (technicalEntry === value) {
          res = true;
        }
        break;
    }
    return res;
  }

  private detectIfConditionAccomplished(condicion: FullConditionsModel, technicalData: BacktestedConditionModel): Array<any> {
    let detectadoCumplimiento = false;
    let seEstaCumpliendoLaCondicion = false;
    //Por cada condicion...
    technicalData.extraData.technical.forEach(technicalArrayOfData => {
      for (let i = 0; i < technicalArrayOfData.length; i++) {
        const registroTecnico = technicalArrayOfData[i];
        if (registroTecnico != null) {
          console.log(registroTecnico);
          detectadoCumplimiento = this.detectIfConditionIsAccomplishedWithSingleEntry(
            condicion.enter.activateWhen,
            condicion.enter.value,
            registroTecnico,
          );
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
    });
    console.log([condicion, technicalData]);
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
