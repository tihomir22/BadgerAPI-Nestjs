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
    return this.execute(
      paramsIndicator.indicatorName.toLowerCase(),
      paramsIndicator,
      historicData,
    );
  }

  async execute(
    indicatorName: string,
    parametros: IndicatorParams,
    historicRegistry: Array<HistoricRegistry>,
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
              parametros.indicatorParams,
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
      if (key == 'real') {
        key = 'close';
      }
      let restmp = registroHistorico.map(historicRegistry =>
        parseFloat(historicRegistry[key] + ''),
      );
      res.push(restmp);
    });
    return res;
  }
}
