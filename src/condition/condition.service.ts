import { Injectable, HttpException } from '@nestjs/common';
import { FullConditionsModel, ConditionPack, DeleteConditionsById, GeneralConfig, EnterConditionModel } from './schemas/Conditions.schema';
import { ServerResponseIndicator, BacktestedConditionModel, FullfillmentModel } from '../models/PaqueteIndicadorTecnico';

import { Observer, Observable, forkJoin } from 'rxjs';
import { BadgerUtils } from '../static/Utils';
import { ConditionRestService } from './services/condition-excutioner/condition-rest.service';
import { UltimoPenultimoCumplimientoRegistro, EstadoEntradaSalidaCondicionEncadenada } from '../models/CumplimientoRegistrosModel';

@Injectable()
export class ConditionService {
  constructor(private conditionREST: ConditionRestService) {}

  async backtestCondition(wrapper: ConditionPack) {
    if (wrapper.conditionConfig && wrapper.conditionConfig.every(entry => entry.indicatorConfig) && wrapper.user) {
      let indicatorData: Array<BacktestedConditionModel> = [];
      let indicatorDataPromises: Array<Promise<BacktestedConditionModel>> = [];
      wrapper.conditionConfig.forEach(condition => {
        indicatorDataPromises.push(this.conditionREST.getLatestTechnicalAndHistoricDataFromCondition(condition, wrapper.generalConfig));
      });
      indicatorData = await forkJoin(indicatorDataPromises).toPromise();

      indicatorData.forEach((backtestedObj, indexBacktestedObj) => {
        backtestedObj.extraData.technical.forEach(technicalArrayOfData => {
          for (let i = 0; i < technicalArrayOfData.length; i++) {
            let technicalData = technicalArrayOfData[i];

            if (wrapper.conditionConfig[indexBacktestedObj].enter) {
              let [condicionRes, backtestingModel] = this.detectIfConditionAccomplished(
                wrapper.conditionConfig[indexBacktestedObj],
                backtestedObj,
                technicalData,
                i,
              );
              wrapper.conditionConfig[indexBacktestedObj] = condicionRes;
              backtestedObj = backtestingModel;
            }

            if (wrapper.conditionConfig[indexBacktestedObj].exit) {
              this.detectIfAccomplishedConditionHasEnded(backtestedObj, technicalData, i);
            }
          }
        });
      });

      return indicatorData;
    } else {
      throw new HttpException('Incorrect condition configuration!', 404);
    }
  }

  private closeAllEntriesBeforeThisIndex(index: number, technicalData: BacktestedConditionModel, indicatorExitoValue: number) {
    for (let i = index; i > 0; i--) {
      let element = technicalData.fulfilled[i];
      if (element) {
        if (element.dateExit != null || element.indicatorExit != null || element.priceExit != null) {
          break;
        }
        /*element.dateExit = new Date(technicalData.extraData.historic[index].closeTime);
        element.indicatorExit = indicatorExitoValue;
        element.priceExit = technicalData.extraData.historic[i].close;*/
        this.closeFullfill(
          element,
          new Date(technicalData.extraData.historic[index].closeTime),
          indicatorExitoValue,
          technicalData.extraData.historic[i].close,
        );
      }
    }
  }

  private closeFullfill(fullfill: FullfillmentModel, closeTime: Date, indicatorExit: number, priceExit: number) {
    fullfill.dateExit = closeTime;
    fullfill.indicatorExit = indicatorExit;
    fullfill.priceExit = priceExit;
  }

  private detectIfAccomplishedConditionHasEnded(backtestedModel: BacktestedConditionModel, technicalRegistry: number, actualIndex: number) {
    if (technicalRegistry != null) {
      switch (backtestedModel.conditionAssociated.exit.typeExit) {
        case 'condition':
          this.detectIfSimpleConditionHasEnded(backtestedModel, technicalRegistry, actualIndex);
          break;
        case 'static':
          this.detectIfStaticConditionHasEnded(backtestedModel, technicalRegistry, actualIndex);
          break;
        default:
          break;
      }
    }
  }

  private detectIfSimpleConditionHasEnded(technicalData: BacktestedConditionModel, technicalEntry: number, i: number) {
    if (
      technicalData.conditionAssociated.exit.closeWhen &&
      technicalData.conditionAssociated.exit.valueBasedOn &&
      technicalData.conditionAssociated.exit.value != null
    ) {
      let valueToCompare =
        technicalData.conditionAssociated.exit.valueBasedOn == 'indicator' ? technicalEntry : technicalData.extraData.historic[i].close;
      switch (technicalData.conditionAssociated.exit.closeWhen) {
        case 'above':
          if (valueToCompare >= technicalData.conditionAssociated.exit.value) {
            this.closeAllEntriesBeforeThisIndex(i, technicalData, technicalEntry);
          }
          break;
        case 'below':
          if (valueToCompare <= technicalData.conditionAssociated.exit.value) {
            this.closeAllEntriesBeforeThisIndex(i, technicalData, technicalEntry);
          }
          break;
        case 'equals':
          if (valueToCompare == technicalData.conditionAssociated.exit.value) {
            this.closeAllEntriesBeforeThisIndex(i, technicalData, technicalEntry);
          }
          break;
      }
    } else {
      throw new HttpException('Not all the parameters are set', 400);
    }
  }

  private detectIfStaticConditionHasEnded(technicalData: BacktestedConditionModel, technicalEntry: number, i: number) {
    if (
      technicalData.conditionAssociated.exit.takeProfitPercentage != null &&
      technicalData.conditionAssociated.exit.stopLossPercentage != null &&
      technicalData.conditionAssociated.exit.valueBasedOn != null
    ) {
      let posicionesSinCerrar: Array<FullfillmentModel> = technicalData.fulfilled.filter(
        entry => entry != null && entry.dateEnter && !entry.indicatorExit && !entry.priceExit,
      );
      posicionesSinCerrar.forEach(posicionSinCerrar => {
        let posicionSinCerrarValor = Number(
          technicalData.conditionAssociated.exit.valueBasedOn == 'indicator'
            ? posicionSinCerrar.indicatorEnter
            : posicionSinCerrar.priceEnter,
        );

        let valorActual = Number(
          technicalData.conditionAssociated.exit.valueBasedOn == 'indicator' ? technicalEntry : technicalData.extraData.historic[i].close,
        );

        if (technicalData.conditionAssociated.enter.doWhat.toLowerCase() == 'buy') {
          let takeProfit = (1 + Number(technicalData.conditionAssociated.exit.takeProfitPercentage) / 100) * valorActual;
          let stopLoss = (1 - Number(technicalData.conditionAssociated.exit.stopLossPercentage) / 100) * valorActual;
          if (posicionSinCerrarValor >= takeProfit || posicionSinCerrarValor <= stopLoss) {
            console.log('cerramos C');
            this.closeFullfill(posicionSinCerrar, new Date(), technicalEntry, technicalData.extraData.historic[i].close);
          }
        } else if (technicalData.conditionAssociated.enter.doWhat.toLowerCase() == 'sell') {
          let takeProfit = (1 - Number(technicalData.conditionAssociated.exit.stopLossPercentage) / 100) * valorActual;
          let stopLoss = (1 + Number(technicalData.conditionAssociated.exit.takeProfitPercentage) / 100) * valorActual;
          if (posicionSinCerrarValor <= takeProfit || posicionSinCerrarValor >= stopLoss) {
            console.log('cerramos V');
            this.closeFullfill(posicionSinCerrar, new Date(), technicalEntry, technicalData.extraData.historic[i].close);
          }
        }
      });
    } else {
      throw new HttpException('Not all the parameters are set', 400);
    }
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

  private detectIfConditionAccomplished(
    condicion: FullConditionsModel,
    backtestingModel: BacktestedConditionModel,
    technicalData: number,
    i: number,
  ): Array<any> {
    let detectadoCumplimiento = false;
    let seEstaCumpliendoLaCondicion = false;

    const registroTecnico = technicalData;
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

  public async recursivelyCheckIfChainedConditionsAreMet(
    mainNodeCondition: FullConditionsModel,
    wrapper: ConditionPack,
    conditionValidationStatus: EstadoEntradaSalidaCondicionEncadenada,
    observer: Observer<EstadoEntradaSalidaCondicionEncadenada>,
  ) {
    for (const valor of mainNodeCondition.chainedTo) {
      let nodoHijoEncontrado = wrapper.conditionConfig.find(entry => entry.id == valor && entry.type == 'Chained');
      if (nodoHijoEncontrado && conditionValidationStatus.entrada) {
        conditionValidationStatus = await this.compareWithChildNode(
          mainNodeCondition,
          nodoHijoEncontrado,
          wrapper.generalConfig,
          conditionValidationStatus,
        );
        nodoHijoEncontrado.chainedTo.splice(
          nodoHijoEncontrado.chainedTo.findIndex(entry => entry == mainNodeCondition.id),
          1,
        );
        if (conditionValidationStatus.entrada && nodoHijoEncontrado.chainedTo && nodoHijoEncontrado.chainedTo.length > 0) {
          await this.recursivelyCheckIfChainedConditionsAreMet(nodoHijoEncontrado, wrapper, conditionValidationStatus, observer);
        }
      }
    }
    observer.next(conditionValidationStatus);
  }

  private async compareWithChildNode(
    mainNodeCondition: FullConditionsModel,
    nodoHijoEncontrado: FullConditionsModel,
    generalData: GeneralConfig,
    latestStatus: EstadoEntradaSalidaCondicionEncadenada,
  ): Promise<EstadoEntradaSalidaCondicionEncadenada> {
    let [mainNodeTechnicalData, childNodeTechnicalData] = await Promise.all([
      this.conditionREST.getLatestTechnicalAndHistoricDataFromCondition(mainNodeCondition, generalData),
      this.conditionREST.getLatestTechnicalAndHistoricDataFromCondition(nodoHijoEncontrado, generalData),
    ]);
    let cumplimientoRegistrosNodeA = this.comprobacionCumplimientoUltimosRegistros(mainNodeCondition, mainNodeTechnicalData);
    let cumplimientoRegistrosNodeB = this.comprobacionCumplimientoUltimosRegistros(nodoHijoEncontrado, childNodeTechnicalData);

    let cumplimientoSalidaNodeA = this.comprobacionCumplimientoSalidaSoloUltimoRegistro(mainNodeCondition, mainNodeTechnicalData);
    let cumplimientoSalidaNodeB = this.comprobacionCumplimientoSalidaSoloUltimoRegistro(nodoHijoEncontrado, childNodeTechnicalData);
    if (cumplimientoRegistrosNodeA == null) cumplimientoSalidaNodeA = latestStatus.salida;
    if (cumplimientoSalidaNodeB == null) cumplimientoSalidaNodeB = latestStatus.salida;
    /* console.log(
      mainNodeTechnicalData.extraData.technical[0].slice(Math.max(mainNodeTechnicalData.extraData.technical[0].length - 5, 0)),
      childNodeTechnicalData.extraData.technical[0].slice(Math.max(childNodeTechnicalData.extraData.technical[0].length - 5, 0)),
    );
    console.log(cumplimientoRegistrosNodeA, cumplimientoRegistrosNodeB);
*/

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
      //  console.log(historicDataAndTechnical.extraData.technical);
      let basedValueToexit =
        configCondition.exit.valueBasedOn == 'indicator'
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
