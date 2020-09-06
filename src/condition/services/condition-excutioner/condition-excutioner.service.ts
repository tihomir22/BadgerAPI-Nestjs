import { Injectable, HttpException, Logger } from '@nestjs/common';
import { forkJoin, Observer, Observable, of, config, timer } from 'rxjs';
import { ExchangeInfo, Account } from 'binance-api-node';
import { InjectModel } from '@nestjs/mongoose';
import { cloneDeep, clone } from 'lodash';
import { Model } from 'mongoose';
import { GeneralService } from '../../../general/general.service';
import * as moment from 'moment';
import { isBoolean } from 'util';
import { ConditionService } from '../../condition.service';
import { KeysService } from '../../../keys/keys.service';
import { ExchangeCoordinatorService } from '../../../exchange-coordinator/exchange-coordinator';
import { WrapperSchemaFuturesOrderInfo, FuturesAccountInfo, FuturesOrderInfo } from '../../../models/FuturesAccountInfo';
import { UserKey } from '../../../keys/schemas/UserKeys.schema';
import { ConditionPack, FullConditionsModel } from '../../schemas/Conditions.schema';
import { BadgerUtils } from '../../../static/Utils';
import { ConditionRestService } from './condition-rest.service';
import { EstadoEntradaSalidaCondicionEncadenada } from '../../../models/CumplimientoRegistrosModel';

@Injectable()
export class ConditionExcutionerService {
  private readonly logger = new Logger(ConditionExcutionerService.name);
  constructor(
    private conditionService: ConditionService,
    private keysService: KeysService,
    private exchangeCoordinator: ExchangeCoordinatorService,
    private generalService: GeneralService,
    private conditionREST: ConditionRestService,
    @InjectModel('ConditionLogs') private conditionLogs: Model<WrapperSchemaFuturesOrderInfo>,
  ) {}

  private obtainAccountInfoAndFuturesExchangeInfo(
    keyUsuarioObtenida: UserKey,
    condicionMongoDb: ConditionPack,
    isTestnet: boolean,
  ): Promise<[Array<FuturesAccountInfo>, ExchangeInfo, any]> {
    return Promise.all([
      this.exchangeCoordinator
        .returnFuturesAccountInfoFromSpecificExchange({
          public: keyUsuarioObtenida.publicK,
          private: keyUsuarioObtenida.privateK,
          exchange: condicionMongoDb.generalConfig.exchange,
          isTestnet,
        })
        .catch(err => {
          console.log('futuresaccount', err);
          return err;
        }),
      this.exchangeCoordinator.returnFuturesExchangeInfoFromSpecificExchange(condicionMongoDb.generalConfig.exchange).catch(err => {
        console.log('error exchange');
        return err;
      }),
      this.exchangeCoordinator
        .returnPriceOfAssetDependingOnExchange(
          condicionMongoDb.generalConfig.exchange,
          condicionMongoDb.generalConfig.historicParams.symbol,
        )
        .catch(err => {
          console.log('error price');
          return err;
        }),
    ]);
  }

  public executeOrder(
    keys: UserKey,
    clientCorderID: string,
    simbolo: string,
    lado: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_RPOFIT_MARKET',
    quantity: number,
    exchange: string,
  ) {
    /**
     * Parametros adicionales dependiendo del tipo de trade
     * LIMIT	timeInForce, quantity, price
      MARKET	quantity
      STOP/TAKE_PROFIT	quantity, price, stopPrice
      STOP_MARKET/TAKE_PROFIT_MARKET	stopPrice
      TRAILING_STOP_MARKET	callbackRate
     */

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

  private async executePreparationsBasicCondition(configCondition: FullConditionsModel, conditionPack: ConditionPack) {
    if (configCondition.state == 'started') {
      let historicDataAndTechnical = await this.conditionREST.getLatestTechnicalAndHistoricDataFromCondition(
        configCondition,
        conditionPack.generalConfig,
      );
      //Cada vez que se activa este metodo, es cuando una vela ha cerrado, por lo que debo comprobar la vela anterior si cumple las condiciones ( restar -2 al array)
      let cumplimientoUltimosRegistros = this.conditionService.comprobacionCumplimientoUltimosRegistros(
        configCondition,
        historicDataAndTechnical,
      );
      if (this.conditionService.seCumpleCondicion(cumplimientoUltimosRegistros) || BadgerUtils.IS_TESTNET) {
        this.prepareToExecuteOrder(configCondition, conditionPack, null);
      } else if (configCondition.exit) {
        let cumplimientoSalida = this.conditionService.comprobacionCumplimientoSalidaSoloUltimoRegistro(
          configCondition,
          historicDataAndTechnical,
        );
        if (isBoolean(cumplimientoSalida)) {
          this.ejecutarSalida(configCondition, conditionPack, null);
        }
      } else {
        console.warn('Condition test executed , but no conditions matched');
      }
    } else {
      this.logger.debug(`The condition ${configCondition.name} has not been init.`);
    }
  }

  private comprobarSiLasCondicionesEncadenadasSeCumplen(mainNodeCondition: FullConditionsModel, wrapperCondiciones: ConditionPack) {
    if (mainNodeCondition.isMainChainingNode) {
      if (mainNodeCondition.state == 'started') {
        let validityStatus: EstadoEntradaSalidaCondicionEncadenada = { entrada: true, salida: false };
        new Observable(observer => {
          this.conditionService.recursivelyCheckIfChainedConditionsAreMet(mainNodeCondition, wrapperCondiciones, validityStatus, observer);
        }).subscribe((data: EstadoEntradaSalidaCondicionEncadenada) => {
          //TODO comprobar que no se ejecuten duplicados
          console.log('whoop', data);
          if (data.entrada) {
            this.prepareToExecuteOrder(mainNodeCondition, wrapperCondiciones, null);
          } else if (data.salida) {
            console.log('se debe cerrar');
          } else {
            this.logger.debug(`The chained conditions didn't match at all.`);
          }
        });
      } else {
        this.logger.debug(`The condition ${mainNodeCondition.name} is mainNode but not started.`);
      }
    } else {
      this.logger.debug(`The condition ${mainNodeCondition.name} is not mainNode but chained, is ignored.`);
    }
  }

  public executePreparations(conditionPack: ConditionPack[], observer: Observer<any>) {
    try {
      conditionPack.forEach(condicionWrapper => {
        if (condicionWrapper.conditionConfig && condicionWrapper.conditionConfig.length > 0) {
          condicionWrapper.conditionConfig.forEach(configCondition => {
            switch (configCondition.type) {
              case 'Basic':
                this.executePreparationsBasicCondition(configCondition, condicionWrapper);
                break;
              case 'Chained':
                this.comprobarSiLasCondicionesEncadenadasSeCumplen(configCondition, condicionWrapper);
                break;
              default:
                break;
            }
          });
        }
      });
    } catch (error) {
      observer.next(error);
    }
  }

  private async ejecutarSalida(configCondition: FullConditionsModel, condicionMongoDb: ConditionPack, observer: Observer<any>) {
    let keysUsuario = await this.keysService.returnKeysByUserID(condicionMongoDb.user);
    let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysUsuario, condicionMongoDb.generalConfig.exchange);
    if (keyUsuarioObtenida) {
      console.log('executing exit');
      // await this.closeTrades(configCondition.id, condicionMongoDb.user, keyUsuarioObtenida);
    }
  }

  public prepareToExecuteOrder(subCondicion: FullConditionsModel, wrapperCondiciones: ConditionPack, emisorRespuesta?: Observer<any>) {
    this.keysService.returnKeysByUserID(wrapperCondiciones.user).then(keysDelUser => {
      let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysDelUser, wrapperCondiciones.generalConfig.exchange);
      if (keyUsuarioObtenida) {
        this.obtainAccountInfoAndFuturesExchangeInfo(keyUsuarioObtenida, wrapperCondiciones, keyUsuarioObtenida.isTestnet).then(
          ([cuenta, exchangeInfo, ultimoPrecioAsset]) => {
            //Cuando apliquemos cantidades fijas, debemos tenerlas en cuenta en vez de obtener todas las posesiones del usuario
            let cantidadEnTetherDelUsuario = parseFloat(cuenta.find(entry => entry.asset === 'USDT').withdrawAvailable);
            let futureAssetInfo = exchangeInfo.symbols.find(
              exchangeSymbol => exchangeSymbol.symbol.toLowerCase() == wrapperCondiciones.generalConfig.historicParams.symbol.toLowerCase(),
            );

            if (futureAssetInfo) {
              this.tryToExecuteOrder(
                futureAssetInfo,
                ultimoPrecioAsset,
                cantidadEnTetherDelUsuario,
                keyUsuarioObtenida,
                wrapperCondiciones,
                subCondicion,
              );
              console.log('executing order');
            } else {
              if (emisorRespuesta) emisorRespuesta.next([futureAssetInfo]);
            }
          },
        );
      } else {
        throw new HttpException(`No key found for the user ${wrapperCondiciones.user}`, 404);
      }
    });
  }

  private async tryToExecuteOrder(
    futureAssetInfo: any,
    ultimoPrecioAsset: number,
    cantidadEnTetherDelUsuario: number,
    keyUsuarioObtenida: UserKey,
    wrapperCondiciones: ConditionPack,
    subCondicion: FullConditionsModel,
  ) {
    let busquedaCantidadMinimaDeEntrada = futureAssetInfo.filters.find((filtro: any) => filtro.filterType == 'MARKET_LOT_SIZE');
    if (busquedaCantidadMinimaDeEntrada) {
      let stepSize = parseFloat(busquedaCantidadMinimaDeEntrada['stepSize']);
      let cantidadMinima = parseFloat(busquedaCantidadMinimaDeEntrada['minQty']);
      let cantidadMinimaDeTether = ultimoPrecioAsset * cantidadMinima;
      let cantidadAInvertirEnSiguienteOperacionTether = parseInt(cantidadEnTetherDelUsuario / 2 / stepSize + '') * stepSize;
      let cantidadAInvertirEnSiguienteOperacion = cantidadEnTetherDelUsuario / ultimoPrecioAsset / 2;
      if (
        cantidadAInvertirEnSiguienteOperacionTether >= cantidadMinimaDeTether &&
        cantidadAInvertirEnSiguienteOperacion >= cantidadMinima
      ) {
        console.log('el usuario tiene suficiente pasta');
        let operacion = await this.executeOrder(
          keyUsuarioObtenida,
          wrapperCondiciones.user + ':' + Math.floor(Math.random() * 100) + 1 + ':' + subCondicion.id,
          wrapperCondiciones.generalConfig.historicParams.symbol,
          subCondicion.enter.doWhat.toUpperCase().trim() as any,
          subCondicion.enter.doWhat.toUpperCase().trim() == 'BUY' ? 'LONG' : 'SHORT',
          'MARKET',
          cantidadAInvertirEnSiguienteOperacion,
          wrapperCondiciones.generalConfig.exchange,
        );

        if (operacion.clientOrderId) {
          //Si la operación fue exitosa
          this.inserTradeLog(operacion, wrapperCondiciones.generalConfig.exchange, ultimoPrecioAsset, Date.now());
          this.generalService.sendNotificationToSpecificUser(
            wrapperCondiciones.user,
            this.generalService.generateNotification(
              `Position opened ${operacion.side}`,
              `A position was opened at ${ultimoPrecioAsset}$ at ${moment()
                .format('DD/MM/YYYY HH:MM')
                .toString()} with ${operacion.cumQty} size.`,
            ),
          );
          if (subCondicion.exit && subCondicion.exit.typeExit == 'static') {
            console.log('debemos crear posiciones de take profit y stop loss');
          }
        }
      } else {
        console.log('El usuario debe ingresar más pasta :D');
      }
    }
  }

  public async inserTradeLog(data: FuturesOrderInfo, exchange: string, openPrice: number, openTime: number) {
    const createdExchange = new this.conditionLogs({
      trade: data,
      status: 'abierto',
      exchange: exchange,
      metadata: {
        openPrice: openPrice,
        closePrice: -1,
        openTime: openTime,
        closeTime: -1,
        profitability: -1,
        profitabilityChange: -1,
      },
    });
    return await createdExchange.save();
  }

  public async changeStatusOfLog(newStatus: 'abierto' | 'cerrado', id: any, newData: any) {
    let searchedLog = await this.conditionLogs.findById({ _id: id });
    searchedLog.status = newStatus;
    searchedLog.metadata = clone(Object.assign(searchedLog.metadata, newData));

    if (
      searchedLog.metadata.closePrice &&
      searchedLog.metadata.openPrice &&
      searchedLog.metadata.closePrice > 0 &&
      searchedLog.metadata.openPrice > 0
    ) {
      if (searchedLog.trade.side == 'BUY') {
        searchedLog.metadata.profitability = searchedLog.metadata.closePrice - searchedLog.metadata.openPrice;
        searchedLog.metadata.profitabilityChange = BadgerUtils.getPercentageChange(
          searchedLog.metadata.openPrice,
          searchedLog.metadata.openPrice + searchedLog.metadata.profitability,
        );
      } else if (searchedLog.trade.side == 'SELL') {
        searchedLog.metadata.profitability = searchedLog.metadata.openPrice - searchedLog.metadata.closePrice;
        searchedLog.metadata.profitabilityChange = BadgerUtils.getPercentageChange(
          searchedLog.metadata.openPrice,
          searchedLog.metadata.openPrice + searchedLog.metadata.profitability,
        );
      }
    }
    return await searchedLog.updateOne(searchedLog.toJSON());
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
        promiseData.subscribe(async (data: FuturesOrderInfo) => {
          if (data.clientOrderId) {
            let price = await this.exchangeCoordinator.returnPriceOfAssetDependingOnExchange(
              tradeWRapper.exchange,
              tradeWRapper.trade.symbol,
            );
            this.changeStatusOfLog('cerrado', tradeWRapper.id, { closePrice: price, closeTime: Date.now() });
            this.generalService.sendNotificationToSpecificUser(
              userKeys.user,
              this.generalService.generateNotification(
                `Position closed ${data.side}`,
                `A position was closed at ${tradeWRapper.metadata.closePrice}$ at ${moment()
                  .format('DD/MM/YYYY HH:MM')
                  .toString()} with ${tradeWRapper.metadata.profitability}$ / ${tradeWRapper.metadata.profitabilityChange}%`,
              ),
            );
          }
        }),
      );
    } else {
      console.info('Malformed trade cannot be close.');
    }
  }
}
