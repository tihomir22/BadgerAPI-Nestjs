import { Injectable, HttpException } from '@nestjs/common';
import { HistoricRegistry } from '../models/HistoricRegistry';
import { IndicatorParams } from '../models/PaqueteIndicadorTecnico';

@Injectable()
export class TechnicalIndicatorsService {
  private publicClient = require('tulind');

  constructor() {}

  public getVersion() {
    return this.publicClient.version;
  }

  public getClient() {
    return this.publicClient;
  }

  async evaluateIndicator(
    paramsIndicator: IndicatorParams,
    historicData: Array<HistoricRegistry>,
  ) {
    switch (paramsIndicator.indicatorName.toLowerCase()) {
      case 'sma':
      case 'ema':
      case 'wma':
      case 'dema':
      case 'tema':
      case 'trima':
      case 'kama':
      case 'hma':
      case 'zlema':
      case 'vwma':
      case 'adosc':
      case 'adx':
      case 'adxr':
      case 'apo':
      case 'aroon':
      case 'aroonosc':
      case 'atr':
      case 'bbands':
      case 'cci':
      case 'cmo':
      case 'cvi':
      case 'decay':
      case 'di':
      case 'dm':
      case 'dpo':
      case 'dx':
      case 'edecay':
        return this.execute(
          paramsIndicator.indicatorName.toLowerCase(),
          paramsIndicator,
          historicData,
        );
      case 'abs':
      case 'ad':
      case 'add':
      case 'ao':
      case 'atan':
      case 'avgprice':
      case 'bop':
      case 'ceil':
      case 'cos':
      case 'crossany':
      case 'crossover':
      case 'div':
      case 'emv':
      case 'exp':
        return this.execute(
          paramsIndicator.indicatorName.toLowerCase(),
          paramsIndicator,
          historicData,
          true,
        );

      default:
        break;
    }
  }

  async execute(
    indicatorName: string,
    parametros: IndicatorParams,
    historicRegistry: Array<HistoricRegistry>,
    noParamsIndicator?: boolean,
  ) {
    try {
      if (
        this.publicClient.indicators[indicatorName].inputs ==
        parametros.keysNeeded.length
      ) {
        if (
          this.publicClient.indicators[indicatorName].options ==
          parametros.indicatorParams.length
        ) {
          return {
            historic: parametros.includeHistoric ? historicRegistry : [],
            technical: await this.publicClient.indicators[
              indicatorName
            ].indicator(
              this.obtenerArrayDeArrays(
                parametros.keysNeeded,
                historicRegistry,
              ),
              noParamsIndicator ? [] : parametros.indicatorParams,
            ),
          };
        } else {
          throw new HttpException(
            'You have introduced an incorrect number of options, ' +
              this.publicClient.indicators[indicatorName].options +
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
            this.publicClient.indicators[indicatorName].inputs +
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

  private obtenerArrayDeArrays(
    keys: Array<string>,
    registroHistorico: Array<HistoricRegistry>,
  ): Array<Array<any>> {
    let res = [];
    keys.forEach(key => {
      let restmp = registroHistorico.map(historicRegistry =>
        parseFloat(historicRegistry[key] + ''),
      );
      res.push(restmp);
    });
    return res;
  }
}
