import { Injectable, HttpException } from '@nestjs/common';
import { HistoricRegistry } from '../models/HistoricRegistry';
import { IndicatorParams } from '../models/PaqueteIndicadorTecnico';
import { concat, times } from 'lodash';
import * as customTechnicalData from '../rawDataJSON/listaIndicadores.json';
export interface TechnicalIndicatorTulind {
  name: string;
  hide?: boolean;
  full_name: string;
  type: string;
  inputs: number;
  options: number;
  outputs: number;
  input_names: Array<string>;
  option_names: Array<string>;
  output_names: Array<string>;
}
@Injectable()
export class TechnicalIndicatorsService {
  private publicClient = require('tulind');
  private customTechnicalIndicators;
  constructor() {
    let objRes = {};
    Object.keys(customTechnicalData).forEach((entry, index) => {
      if (!customTechnicalData[entry].hide) {
        objRes[entry] = customTechnicalData[entry];
      }
    });
    this.customTechnicalIndicators = objRes;
  }

  public returnCustomIndicators(): Array<any> {
    return this.customTechnicalIndicators ? this.customTechnicalIndicators : this.publicClient.indicators;
  }

  public returnByName(name: string) {
    let indicator = this.returnCustomIndicators()[name];
    if (indicator) {
      return indicator;
    } else {
      throw new HttpException('Indicator ' + name + ' not found.', 404);
    }
  }

  public getVersion() {
    return this.publicClient.version;
  }

  public getClient() {
    return this.publicClient;
  }

  async evaluateIndicator(paramsIndicator: IndicatorParams, historicData: Array<HistoricRegistry>) {
    return this.execute(paramsIndicator.indicatorName.toLowerCase(), paramsIndicator, historicData);
  }

  async execute(indicatorName: string, parametros: IndicatorParams, historicRegistry: Array<HistoricRegistry>) {
    if (this.comprobarParametros(indicatorName, parametros)) {
      return this.ejecutarCalculoDeIndicador(indicatorName, parametros, historicRegistry);
    }
  }

  private comprobarParametros(indicatorName: string, parametros: IndicatorParams): boolean {
    let objIndicators = this.returnCustomIndicators();
    try {
      if (objIndicators[indicatorName].inputs == parametros.keysNeeded.length) {
        if (objIndicators[indicatorName].options == parametros.indicatorParams.length) {
          return true;
        } else {
          throw new HttpException(
            'You have introduced an incorrect number of options, ' +
              objIndicators[indicatorName].options +
              ' are needed while you introduced ' +
              parametros.indicatorParams.length +
              ' [ ' +
              parametros.indicatorParams +
              ' ]',
            400,
          );
        }
      } else {
        throw new HttpException(
          'You have introduced an incorrect number of inputs, ' +
            objIndicators[indicatorName].inputs +
            ' are needed while you introduced ' +
            parametros.keysNeeded.length +
            ' [ ' +
            parametros.keysNeeded +
            ' ]',
          400,
        );
      }
    } catch (error) {
      throw new HttpException(error, 400);
    }
  }

  async ejecutarCalculoDeIndicador(indicatorName: string, parametros: IndicatorParams, historicRegistry: Array<HistoricRegistry>) {
    let arrayHistorico = parametros.includeHistoric ? historicRegistry : [];
    let arrayIndicadorTecnico = await this.publicClient.indicators[indicatorName].indicator(
      this.obtenerArrayDeArrays(parametros.keysNeeded, historicRegistry),
      parametros.indicatorParams,
    );
    if (arrayHistorico.length > 0) {
      (arrayIndicadorTecnico as Array<Array<number>>).forEach(arrayNumeros => {
        arrayNumeros.unshift(...this.generarArrayDeElementosVacios(null, arrayHistorico.length - arrayNumeros.length));
      });
    }
    return {
      historic: arrayHistorico,
      technical: arrayIndicadorTecnico,
      outputNames: this.publicClient.indicators[indicatorName].output_names,
      metadataIndicator: this.returnCustomIndicators()[indicatorName],
    };
  }

  private generarArrayDeElementosVacios(elementoVacio: any, numeroDeElementos: number) {
    let res = [];
    times(numeroDeElementos, () => {
      res.push(elementoVacio);
    });
    return res;
  }

  private obtenerArrayDeArrays(keys: Array<string>, registroHistorico: Array<HistoricRegistry>): Array<Array<any>> {
    let res = [];
    keys.forEach(key => {
      if (key == 'real') {
        key = 'close';
      }
      let restmp = registroHistorico.map(historicRegistry => parseFloat(historicRegistry[key] + ''));
      res.push(restmp);
    });
    return res;
  }
}
