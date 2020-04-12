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
import { FuturesAccountInfo } from 'src/models/FuturesAccountInfo';

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
  ) {}

  private obtainAccountInfoAndFuturesExchangeInfo(
    keyUsuarioObtenida: UserKey,
    condicionMongoDb: ConditionPack,
  ): Observable<[FuturesAccountInfo, ExchangeInfo, any]> {
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

  async executeOrder(
    simbolo: string,
    lado: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_RPOFIT' | 'TAKE_RPOFIT_MARKET',
    quantity: number,
    exchange: string,
  ) {
    console.log([simbolo, lado, type, quantity, await this.exchangeCoordinator.returnTimeDependingOnExchange(exchange).toPromise()]);
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
              observer.next('jeioejiejie');
            }
          });
        });
      }
    });
  }

  private ejecutarCondicion(subCondicion: FullConditionsModel, wrapperCondiciones: ConditionPack, emisorRespuesta: Observer<any>): void {
    this.keysService.returnKeysByUserID(wrapperCondiciones.user).then(keysDelUser => {
      let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysDelUser, wrapperCondiciones.indicatorConfig.exchange);
      if (keyUsuarioObtenida) {
        this.obtainAccountInfoAndFuturesExchangeInfo(keyUsuarioObtenida, wrapperCondiciones).subscribe(data => {
          //Obtencion de datos
          let cuenta: FuturesAccountInfo = data[0];
          let exchangeInfo: ExchangeInfo = data[1];
          let ultimoPrecioAsset: number = data[2];
          //Cuando apliquemos cantidades fijas, debemos tenerlas en cuenta en vez de obtener todas las posesiones del usuario
          let cantidadEnTetherDelUsuario = parseFloat(cuenta.listaAssets.find(entry => entry.asset === 'USDT').balance);
          let futureAssetInfo = exchangeInfo.symbols.find(
            exchangeSymbol => exchangeSymbol.symbol.toLowerCase() == wrapperCondiciones.indicatorConfig.historicParams.symbol.toLowerCase(),
          );

          if (futureAssetInfo) {
            let busquedaCantidadMinimaDeEntrada = futureAssetInfo.filters.find((filtro: any) => filtro.filterType == 'MARKET_LOT_SIZE');
            if (busquedaCantidadMinimaDeEntrada) {
              let stepSize = parseFloat(busquedaCantidadMinimaDeEntrada['stepSize']);
              let cantidadMinima = parseFloat(busquedaCantidadMinimaDeEntrada['minQty']);
              let cantidadMinimaDeTether = ultimoPrecioAsset * cantidadMinima;
              let cantidadAInvertirEnSiguienteOperacion = parseInt(cantidadEnTetherDelUsuario / 2 / stepSize + '') * stepSize;
              // console.log([cantidadEnTetherDelUsuario, cantidadMinimaDeTether, cantidadAInvertirEnSiguienteOperacion, stepSize]);
              if (cantidadEnTetherDelUsuario > cantidadMinimaDeTether) {
                console.log('el usuario tiene suficiente pasta');
                this.executeOrder(
                  wrapperCondiciones.indicatorConfig.historicParams.symbol,
                  subCondicion.enter.doWhat.toUpperCase().trim() as any,
                  'MARKET',
                  cantidadAInvertirEnSiguienteOperacion,
                  wrapperCondiciones.indicatorConfig.exchange,
                );
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
      configCondition,
      historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 2],
    );

    let cumplimientoPenultimoRegistro = this.conditionService.detectIfConditionIsAccomplishedWithSingleEntry(
      configCondition,
      historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 3],
    );

    return {
      ultimo: cumplimientoUltimoRegistro,
      penultimo: cumplimientoPenultimoRegistro,
    };
  }
}
