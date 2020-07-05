import { Injectable, HttpException } from '@nestjs/common';
import { FullConditionsModel, ConditionPack, DeleteConditionsById, GeneralConfig, EnterConditionModel } from './schemas/Conditions.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import { ServerResponseIndicator, BacktestedConditionModel, FullfillmentModel } from '../models/PaqueteIndicadorTecnico';
import { clone, cloneDeep } from 'lodash';
import {
  EstadoEntradaSalidaCondicionEncadenada,
  UltimoPenultimoCumplimientoRegistro,
} from './services/condition-excutioner/condition-excutioner.service';
import { Observer, Observable, forkJoin } from 'rxjs';
import { BadgerUtils } from '../static/Utils';

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

  public returnById(id: string) {
    return this.conditionModel.findById(id);
  }

  public deleteById(id: string) {
    return this.conditionModel.deleteOne({ _id: id });
  }

  async returnConditionsByTimeFrame(
    timeFrame: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M',
  ) {
    return await this.conditionModel.find({ 'generalConfig.historicParams.interval': timeFrame });
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

  public saveWrapper(wrapper: ConditionPack) {
    return this.conditionModel.findOneAndUpdate(
      {
        _id: wrapper._id,
      },
      wrapper,
    );
  }

  public newWrapper(condicion: ConditionPack) {
    if (condicion.conditionConfig && condicion.conditionConfig.every(entry => entry.indicatorConfig) && condicion.user) {
      const createdCondition: ConditionPack = new this.conditionModel({
        user: condicion.user,
        conditionConfig: condicion.conditionConfig,
        generalConfig: condicion.generalConfig,
      });
      return createdCondition.save();
    } else {
      throw new HttpException('Incorrect condition configuration!', 400);
    }
  }

  async getLatestTechnicalAndHistoricDataFromCondition(
    condicion: FullConditionsModel,
    generalConfig: GeneralConfig,
  ): Promise<BacktestedConditionModel> {
    return {
      fulfilled: [],
      extraData: await this.indicatorService.evaluateIndicator(
        condicion.indicatorConfig[0].indicatorParams,
        await (this.exchangeCoordinator.devolverHistoricoDependendiendoDelEXCHANGE(generalConfig) as any),
      ),
      conditionAssociated: condicion,
    };
  }

  async backtestCondition(wrapper: ConditionPack) {
    if (wrapper.conditionConfig && wrapper.conditionConfig.every(entry => entry.indicatorConfig) && wrapper.user) {
      let indicatorData: Array<BacktestedConditionModel> = [];
      let indicatorDataPromises: Array<Promise<BacktestedConditionModel>> = [];
      wrapper.conditionConfig.forEach(condition => {
        indicatorDataPromises.push(this.getLatestTechnicalAndHistoricDataFromCondition(condition, wrapper.generalConfig));
      });
      indicatorData = await forkJoin(indicatorDataPromises).toPromise();
      indicatorData.forEach((backtestedObj, indexBacktestedObj) => {
        if (wrapper.conditionConfig[indexBacktestedObj].enter && wrapper.conditionConfig[indexBacktestedObj].enter.activateWhen) {
          let [condicionRes, backtestingModel] = this.detectIfConditionAccomplished(
            wrapper.conditionConfig[indexBacktestedObj],
            backtestedObj,
          );
          wrapper.conditionConfig[indexBacktestedObj] = condicionRes;
          backtestedObj = backtestingModel;
        }

        if (wrapper.conditionConfig[indexBacktestedObj].exit && wrapper.conditionConfig[indexBacktestedObj].exit.closeWhen) {
          let [condicionRes2, backtestingModel2] = this.detectIfAccomplishedConditionHasEnded(
            wrapper.conditionConfig[indexBacktestedObj],
            backtestedObj,
          );
          wrapper.conditionConfig[indexBacktestedObj] = condicionRes2;
          backtestedObj = backtestingModel2;
        }
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
    return [condicion, technicalData];
  }

  public detectIfConditionIsAccomplishedWithSingleEntry(
    activateWhen: 'below' | 'above' | 'equals',
    isDynamicValue: boolean,
    conditionStaticValue: any,
    technicalEntry: number,
    historicEntryClose: number,
  ) {
    let res = false;
    switch (activateWhen) {
      case 'above':
        if (!isDynamicValue) {
          if (technicalEntry >= conditionStaticValue) {
            res = true;
          }
        } else {
          if (technicalEntry >= historicEntryClose) {
            res = true;
          }
        }

        break;
      case 'below':
        if (!isDynamicValue) {
          if (technicalEntry <= conditionStaticValue) {
            res = true;
          }
        } else {
          if (technicalEntry <= historicEntryClose) {
            res = true;
          }
        }
        break;
      case 'equals':
        if (!isDynamicValue) {
          if (technicalEntry === conditionStaticValue) {
            res = true;
          }
        } else {
          console.log('dinamico man', [technicalEntry, historicEntryClose]);
          if (technicalEntry <= historicEntryClose) {
            res = true;
          }
        }
        break;
    }
    return res;
  }

  public comprobacionCumplimientoUltimosRegistros(
    configCondition: FullConditionsModel,
    historicDataAndTechnical: BacktestedConditionModel,
  ): UltimoPenultimoCumplimientoRegistro {
    let cumplimientoUltimoRegistro = this.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition.enter.activateWhen,
      configCondition.enter.dynamicValue,
      configCondition.enter.value,
      historicDataAndTechnical.extraData.technical[0][historicDataAndTechnical.extraData.technical[0].length - 2],
      historicDataAndTechnical.extraData.historic[historicDataAndTechnical.extraData.technical[0].length - 2].close,
    );
    //TODO INDICE 0 REVISAR , TODO OKAY SI SOLO QUEREMOS 1 INDICADOR POR CONDICIN
    let cumplimientoPenultimoRegistro = this.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition.enter.activateWhen,
      configCondition.enter.dynamicValue,
      configCondition.enter.value,
      historicDataAndTechnical.extraData.technical[0][historicDataAndTechnical.extraData.technical[0].length - 3],
      historicDataAndTechnical.extraData.historic[historicDataAndTechnical.extraData.technical[0].length - 3].close,
    );

    return {
      ultimo: cumplimientoUltimoRegistro,
      penultimo: cumplimientoPenultimoRegistro,
    };
  }

  private detectIfConditionAccomplished(condicion: FullConditionsModel, backtestingModel: BacktestedConditionModel): Array<any> {
    let detectadoCumplimiento = false;
    let seEstaCumpliendoLaCondicion = false;
    //Por cada condicion...
    backtestingModel.extraData.technical.forEach(technicalArrayOfData => {
      for (let i = 0; i < technicalArrayOfData.length; i++) {
        const registroTecnico = technicalArrayOfData[i];
        const registroHistorico = backtestingModel.extraData.historic[i].close;
        if (registroTecnico != null) {
          detectadoCumplimiento = this.detectIfConditionIsAccomplishedWithSingleEntry(
            condicion.enter.activateWhen,
            condicion.enter.dynamicValue,
            condicion.enter.value,
            registroTecnico,
            registroHistorico,
          );
          if (!condicion.enter.dynamicValue) {
            let resdetectIfConditionAccomplishmentEnded: Array<any> = this.detectIfConditionAccomplishmentEnded(
              detectadoCumplimiento,
              seEstaCumpliendoLaCondicion,
            );
            detectadoCumplimiento = resdetectIfConditionAccomplishmentEnded[0];
            seEstaCumpliendoLaCondicion = resdetectIfConditionAccomplishmentEnded[1];
          }
          if (detectadoCumplimiento && registroTecnico != null) {
            backtestingModel.fulfilled[i] = {
              id: +new Date() + 'CDN',
              priceEnter: backtestingModel.extraData.historic[i].close,
              indicatorEnter: registroTecnico,
              dateEnter: new Date(backtestingModel.extraData.historic[i].openTime),
              priceExit: null,
              indicatorExit: null,
              dateExit: null,
            };
          } else {
            backtestingModel.fulfilled[i] = null;
          }
          detectadoCumplimiento = false;
        } else {
          backtestingModel.fulfilled[i] = null;
        }
      }
    });
    return [condicion, backtestingModel];
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

  public recursivelyCheckIfChainedConditionsAreMet(
    mainNodeCondition: FullConditionsModel,
    allConditions: Array<FullConditionsModel>,
    generalData: GeneralConfig,
    conditionValidationStatus: EstadoEntradaSalidaCondicionEncadenada,
    numeroCola: number,
    numeroColaProcesados: number,
    observer: Observer<EstadoEntradaSalidaCondicionEncadenada>,
  ) {
    mainNodeCondition.chainedTo.forEach(async (chainedConditionId, index) => {
      let nodoHijoEncontrado = allConditions.find(entry => entry.id == chainedConditionId && entry.type == 'Chained');
      if (nodoHijoEncontrado && conditionValidationStatus.entrada) {
        numeroCola++;
        conditionValidationStatus = await this.compareWithChildNode(
          mainNodeCondition,
          nodoHijoEncontrado,
          generalData,
          conditionValidationStatus,
        );
        numeroColaProcesados++;
        if (conditionValidationStatus.entrada && nodoHijoEncontrado.chainedTo && nodoHijoEncontrado.chainedTo.length > 0) {
          this.recursivelyCheckIfChainedConditionsAreMet(
            nodoHijoEncontrado,
            allConditions,
            generalData,
            conditionValidationStatus,
            numeroCola,
            numeroColaProcesados,
            observer,
          );
        } else if (numeroCola === numeroColaProcesados && index == 0) observer.next(conditionValidationStatus);
      } else if (numeroCola === numeroColaProcesados && index == 0) observer.next(conditionValidationStatus);
    });
  }

  private async compareWithChildNode(
    mainNodeCondition: FullConditionsModel,
    nodoHijoEncontrado: FullConditionsModel,
    generalData: GeneralConfig,
    latestStatus: EstadoEntradaSalidaCondicionEncadenada,
  ): Promise<EstadoEntradaSalidaCondicionEncadenada> {
    let [mainNodeTechnicalData, childNodeTechnicalData] = await Promise.all([
      this.getLatestTechnicalAndHistoricDataFromCondition(mainNodeCondition, generalData),
      this.getLatestTechnicalAndHistoricDataFromCondition(nodoHijoEncontrado, generalData),
    ]);
    let cumplimientoRegistrosNodeA = this.comprobacionCumplimientoUltimosRegistros(mainNodeCondition, mainNodeTechnicalData);
    let cumplimientoRegistrosNodeB = this.comprobacionCumplimientoUltimosRegistros(nodoHijoEncontrado, childNodeTechnicalData);

    let cumplimientoSalidaNodeA = this.comprobacionCumplimientoSalidaSoloUltimoRegistro(mainNodeCondition, mainNodeTechnicalData);
    let cumplimientoSalidaNodeB = this.comprobacionCumplimientoSalidaSoloUltimoRegistro(nodoHijoEncontrado, childNodeTechnicalData);
    if (cumplimientoRegistrosNodeA == null) cumplimientoSalidaNodeA = latestStatus.salida;
    if (cumplimientoSalidaNodeB == null) cumplimientoSalidaNodeB = latestStatus.salida;
    console.log(
      mainNodeTechnicalData.extraData.technical[0].slice(Math.max(mainNodeTechnicalData.extraData.technical[0].length - 5, 0)),
      childNodeTechnicalData.extraData.technical[0].slice(Math.max(childNodeTechnicalData.extraData.technical[0].length - 5, 0)),
    );
    console.log(cumplimientoRegistrosNodeA, cumplimientoRegistrosNodeB);

    nodoHijoEncontrado.chainedTo.splice(
      nodoHijoEncontrado.chainedTo.findIndex(entry => entry == mainNodeCondition.id),
      1,
    );
    return {
      entrada: this.seCumpleCondicionEncadenada(cumplimientoRegistrosNodeA, cumplimientoRegistrosNodeB, nodoHijoEncontrado.chainingType),
      salida: this.seCumpleSalidaEncadenada(cumplimientoSalidaNodeA, cumplimientoSalidaNodeB, nodoHijoEncontrado.chainingType),
    };
  }

  public comprobacionCumplimientoSalidaSoloUltimoRegistro(
    configCondition: FullConditionsModel,
    historicDataAndTechnical: BacktestedConditionModel,
  ) {
    if (configCondition.exit) {
      console.log(historicDataAndTechnical.extraData.technical);
      let basedValueToexit =
        configCondition.exit.typeExit == 'indicator'
          ? historicDataAndTechnical.extraData.technical[0][historicDataAndTechnical.extraData.technical[0].length - 2]
          : historicDataAndTechnical.extraData.historic[historicDataAndTechnical.extraData.historic.length - 2].close;
      //TODO INDICE 0 REVISAR , TODO OKAY SI SOLO QUEREMOS 1 INDICADOR POR CONDICIN
      return this.detectIfConditionIsAccomplishedWithSingleEntry(
        configCondition.exit.closeWhen,
        false,
        configCondition.exit.value,
        basedValueToexit[0],
        null,
      );
    } else {
      return null;
    }
  }

  private seCumpleCondicionEncadenada(
    ultimoPenultimoNodoA: UltimoPenultimoCumplimientoRegistro,
    ultimoPenultimoNodoB: UltimoPenultimoCumplimientoRegistro,
    tipoEncadenacion: 'AND' | 'OR',
  ) {
    switch (tipoEncadenacion.toUpperCase()) {
      case 'AND':
        return this.seCumpleCondicion(ultimoPenultimoNodoA) && this.seCumpleCondicion(ultimoPenultimoNodoB);
      case 'OR':
        return this.seCumpleCondicion(ultimoPenultimoNodoA) || this.seCumpleCondicion(ultimoPenultimoNodoB);
      default:
        break;
    }
  }

  private seCumpleSalidaEncadenada(ultimoPenultimoNodoA: boolean, ultimoPenultimoNodoB: boolean, tipoEncadenacion: 'AND' | 'OR') {
    switch (tipoEncadenacion.toUpperCase()) {
      case 'AND':
        return ultimoPenultimoNodoA && ultimoPenultimoNodoB;
      case 'OR':
        return ultimoPenultimoNodoA || ultimoPenultimoNodoB;
      default:
        break;
    }
  }

  public seCumpleCondicion(ultimoPenultimo: UltimoPenultimoCumplimientoRegistro) {
    return ultimoPenultimo.ultimo && !ultimoPenultimo.penultimo;
  }
}
