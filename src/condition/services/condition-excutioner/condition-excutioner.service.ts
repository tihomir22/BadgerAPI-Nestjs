import { Injectable, HttpException } from '@nestjs/common';
import { ConditionService } from 'src/condition/condition.service';
import { FullConditionsModel, ConditionPack } from 'src/condition/schemas/Conditions.schema';
import { BacktestedConditionModel } from 'src/models/PaqueteIndicadorTecnico';
import { KeysService } from 'src/keys/keys.service';
import { ExchangeCoordinatorService } from 'src/exchange-coordinator/exchange-coordinator';
import { BadgerUtils } from 'src/static/Utils';
import { forkJoin, Observer, Observable, of, config } from 'rxjs';
import { ExchangeInfo, Account } from 'binance-api-node';
import { UserKey } from 'src/keys/schemas/UserKeys.schema';
import { FuturesAccountInfo, FuturesOrderInfo, WrapperSchemaFuturesOrderInfo } from 'src/models/FuturesAccountInfo';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
export interface UltimoPenultimoCumplimientoRegistro {
  ultimo: boolean;
  penultimo: boolean;
}

@Injectable()
export class ConditionExcutionerService {
  constructor(
    private conditionService: ConditionService,
    private keysService: KeysService,
    private exchangeCoordinator: ExchangeCoordinatorService,
    @InjectModel('ConditionLogs') private conditionLogs: Model<WrapperSchemaFuturesOrderInfo>,
  ) {}

  private obtainAccountInfoAndFuturesExchangeInfo(
    keyUsuarioObtenida: UserKey,
    condicionMongoDb: ConditionPack,
  ): Observable<[Array<FuturesAccountInfo>, ExchangeInfo, any]> {
    return forkJoin([
      this.exchangeCoordinator.returnFuturesAccountInfoFromSpecificExchange({
        public: keyUsuarioObtenida.publicK,
        private: keyUsuarioObtenida.privateK,
        exchange: condicionMongoDb.indicatorConfig.exchange,
      }),
      this.exchangeCoordinator.returnFuturesExchangeInfoFromSpecificExchange(condicionMongoDb.indicatorConfig.exchange),
      this.exchangeCoordinator.returnPriceOfAssetDependingOnExchange(
        condicionMongoDb.indicatorConfig.exchange,
        condicionMongoDb.indicatorConfig.historicParams.symbol,
      ),
    ]);
  }

  public executeOrder(
    keys: UserKey,
    clientCorderID: string,
    simbolo: string,
    lado: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_RPOFIT' | 'TAKE_RPOFIT_MARKET',
    quantity: number,
    exchange: string,
  ) {
    return this.exchangeCoordinator.executeOrderDependingOnExchange(
      {
        keys: {
          public: keys.publicK,
          private: keys.privateK,
        },
        params: {
          symbol: simbolo,
          side: lado,
          positionSide: positionSide,
          type: type,
          quantity: quantity,
          newClientOrderId: clientCorderID,
        },
      },
      exchange,
    );
  }

  public executePreparations(conditionPack: ConditionPack[], observer: Observer<any>) {
    conditionPack.forEach(condicionMongoDb => {
      if (condicionMongoDb.conditionConfig && condicionMongoDb.conditionConfig.length > 0) {
        this.conditionService.getLatestTechnicalAndHistoricDataFromCondition(condicionMongoDb).then(historicDataAndTechnical => {
          condicionMongoDb.conditionConfig.forEach(configCondition => {
            //Cada vez que se activa este metodo, es cuando una vela ha cerrado, por lo que debo comprobar la vela anterior si cumple las condiciones ( restar -2 al array)
            let cumplimientoUltimosRegistros = this.comprobacionCumplimientoUltimosRegistros(configCondition, historicDataAndTechnical);
            console.log(
              historicDataAndTechnical.extraData.technical.slice(Math.max(historicDataAndTechnical.extraData.technical.length - 5, 0)),
            );

            if (cumplimientoUltimosRegistros.ultimo && !cumplimientoUltimosRegistros.penultimo) {
              this.ejecutarCondicion(configCondition, condicionMongoDb, observer);
            } else {
              let cumplimientoSalida = this.comprobacionCumplimientoSalidaSoloUltimoRegistro(configCondition, historicDataAndTechnical);
              if (cumplimientoSalida) {
                this.ejecutarSalida(configCondition, condicionMongoDb, observer);
              } else {
                console.warn('Condition test executed , but no conditions matched');
              }
            }
          });
        });
      }
    });
  }

  private async ejecutarSalida(configCondition: FullConditionsModel, condicionMongoDb: ConditionPack, observer: Observer<any>) {
    let keysUsuario = await this.keysService.returnKeysByUserID(condicionMongoDb.user);
    let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysUsuario, condicionMongoDb.indicatorConfig.exchange);
    if (keyUsuarioObtenida) {
      await this.closeTrades(configCondition.id, condicionMongoDb.user, keyUsuarioObtenida);
    }
  }

  public ejecutarCondicion(subCondicion: FullConditionsModel, wrapperCondiciones: ConditionPack, emisorRespuesta: Observer<any>) {
    this.keysService.returnKeysByUserID(wrapperCondiciones.user).then(keysDelUser => {
      let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysDelUser, wrapperCondiciones.indicatorConfig.exchange);
      if (keyUsuarioObtenida) {
        this.obtainAccountInfoAndFuturesExchangeInfo(keyUsuarioObtenida, wrapperCondiciones).subscribe(async data => {
          //Obtencion de datos
          let cuenta: Array<FuturesAccountInfo> = data[0];
          let exchangeInfo: ExchangeInfo = data[1];
          let ultimoPrecioAsset: number = data[2];

          console.log(cuenta);

          //Cuando apliquemos cantidades fijas, debemos tenerlas en cuenta en vez de obtener todas las posesiones del usuario
          let cantidadEnTetherDelUsuario = parseFloat(cuenta.find(entry => entry.asset === 'USDT').withdrawAvailable);
          let futureAssetInfo = exchangeInfo.symbols.find(
            exchangeSymbol => exchangeSymbol.symbol.toLowerCase() == wrapperCondiciones.indicatorConfig.historicParams.symbol.toLowerCase(),
          );

          if (futureAssetInfo) {
            let busquedaCantidadMinimaDeEntrada = futureAssetInfo.filters.find((filtro: any) => filtro.filterType == 'MARKET_LOT_SIZE');
            if (busquedaCantidadMinimaDeEntrada) {
              let stepSize = parseFloat(busquedaCantidadMinimaDeEntrada['stepSize']);
              let cantidadMinima = parseFloat(busquedaCantidadMinimaDeEntrada['minQty']);
              let cantidadMinimaDeTether = ultimoPrecioAsset * cantidadMinima;
              let cantidadAInvertirEnSiguienteOperacionTether = parseInt(cantidadEnTetherDelUsuario / 2 / stepSize + '') * stepSize;
              let cantidadAInvertirEnSiguienteOperacionBTC = cantidadEnTetherDelUsuario / ultimoPrecioAsset / 2;
              if (
                cantidadAInvertirEnSiguienteOperacionTether >= cantidadMinimaDeTether &&
                cantidadAInvertirEnSiguienteOperacionBTC >= cantidadMinima
              ) {
                console.log('el usuario tiene suficiente pasta');
                this.executeOrder(
                  keyUsuarioObtenida,
                  wrapperCondiciones.user + ':' + Math.floor(Math.random() * 100) + 1 + ':' + subCondicion.id,
                  wrapperCondiciones.indicatorConfig.historicParams.symbol,
                  subCondicion.enter.doWhat.toUpperCase().trim() as any,
                  subCondicion.enter.doWhat.toUpperCase().trim() == 'BUY' ? 'LONG' : 'SHORT',
                  'MARKET',
                  cantidadAInvertirEnSiguienteOperacionBTC,
                  wrapperCondiciones.indicatorConfig.exchange,
                ).then(data => {
                  data.subscribe((data: FuturesOrderInfo) => {
                    if (data.clientOrderId) {
                      this.inserTradeLog(data, wrapperCondiciones.indicatorConfig.exchange);
                    }
                  });
                });
              } else {
                console.log('El usuario debe ingresar más pasta :D');
              }
            }
            emisorRespuesta.next([cuenta]);
          } else {
            emisorRespuesta.next([futureAssetInfo]);
          }
        });
      } else {
        throw new HttpException(`No key found for the user ${wrapperCondiciones.user}`, 404);
      }
    });
  }
  public comprobacionCumplimientoUltimosRegistros(
    configCondition: FullConditionsModel,
    historicDataAndTechnical: BacktestedConditionModel,
  ): UltimoPenultimoCumplimientoRegistro {
    let cumplimientoUltimoRegistro = this.conditionService.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition.enter.activateWhen,
      configCondition.enter.value,
      historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 2],
    );

    let cumplimientoPenultimoRegistro = this.conditionService.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition.enter.activateWhen,
      configCondition.enter.value,
      historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 3],
    );

    return {
      ultimo: cumplimientoUltimoRegistro,
      penultimo: cumplimientoPenultimoRegistro,
    };
  }

  public comprobacionCumplimientoSalidaSoloUltimoRegistro(
    configCondition: FullConditionsModel,
    historicDataAndTechnical: BacktestedConditionModel,
  ) {
    let basedValueToexit =
      configCondition.exit.typeExit == 'indicator'
        ? historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 2]
        : historicDataAndTechnical.extraData.historic[historicDataAndTechnical.extraData.historic.length - 2].close;

    return this.conditionService.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition.exit.closeWhen,
      configCondition.exit.value,
      basedValueToexit,
    );
  }

  private async inserTradeLog(data: FuturesOrderInfo, exchange: string) {
    const createdExchange = new this.conditionLogs({
      trade: data,
      status: 'abierto',
      exchange: exchange,
    });
    return await createdExchange.save();
  }

  private async changeStatusOfLog(newStatus: 'abierto' | 'cerrado', id: any) {
    return await this.conditionLogs.findByIdAndUpdate(
      {
        _id: id,
      },
      {
        $set: {
          status: newStatus,
        },
      },
    );
  }

  private async closeTrades(subCondicionId: number, userName: string, userKeys: UserKey) {
    let todosLosLogs = await this.conditionLogs.find();
    let busqueda = todosLosLogs.filter(entry => {
      if (entry.trade.clientOrderId && entry.status != 'cerrado') {
        let arraySplit = entry.trade.clientOrderId.split(':');
        if (arraySplit[2] === subCondicionId + '' && arraySplit[0] === userName) {
          return true;
        }
      }
      return false;
    });
    busqueda.forEach(trade => {
      this.closeTrade(trade, userKeys);
    });
  }

  private closeTrade(tradeWRapper: WrapperSchemaFuturesOrderInfo, userKeys: UserKey) {
    let closingParams = BadgerUtils.returnOppositeTrade({
      side: tradeWRapper.trade.side as any,
      positionSide: tradeWRapper.trade.positionSide as any,
    });
    if (closingParams != null) {
      this.executeOrder(
        userKeys,
        tradeWRapper.trade.clientOrderId,
        tradeWRapper.trade.symbol,
        closingParams.side as any,
        closingParams.positionSide as any,
        'MARKET',
        parseFloat(tradeWRapper.trade.origQty),
        tradeWRapper.exchange,
      ).then(promiseData =>
        promiseData.subscribe((data: FuturesOrderInfo) => {
          if (data.clientOrderId) {
            this.changeStatusOfLog('cerrado', tradeWRapper.id);
          }
        }),
      );
    } else {
      console.info('Malformed trade cannot be close.');
    }
  }
}
