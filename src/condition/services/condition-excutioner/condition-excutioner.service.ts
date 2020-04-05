import { Injectable, HttpException } from '@nestjs/common';
import { ConditionService } from 'src/condition/condition.service';
import { FullConditionsModel, ConditionPack } from 'src/condition/schemas/Conditions.schema';
import { BacktestedConditionModel } from 'src/models/PaqueteIndicadorTecnico';
import { KeysService } from 'src/keys/keys.service';
import { ExchangeCoordinatorService } from 'src/exchange-coordinator/exchange-coordinator';
import { BadgerUtils } from 'src/static/Utils';
import { forkJoin, Observer } from 'rxjs';
import { ExchangeInfo, Account } from 'binance-api-node';

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

  public executePreparations(conditionPack: ConditionPack[], observer: Observer<any>) {
    conditionPack.forEach(condicionMongoDb => {
      this.conditionService.getLatestTechnicalAndHistoricDataFromCondition(condicionMongoDb).then(historicDataAndTechnical => {
        condicionMongoDb.conditionConfig
          .filter(entry => entry.fundingAsset)
          .forEach(configCondition => {
            //Cada vez que se activa este metodo, es cuando una vela ha cerrado, por lo que debo comprobar la vela anterior si cumple las condiciones ( restar -2 al array)
            let cumplimientoUltimosRegistros = this.comprobacionCumplimientoUltimosRegistros(configCondition, historicDataAndTechnical);
            if (cumplimientoUltimosRegistros.ultimo && !cumplimientoUltimosRegistros.penultimo) {
              console.log('ye');
              this.keysService.returnKeysByUserID(condicionMongoDb.user).then(keysDelUser => {
                let keyUsuarioObtenida = BadgerUtils.busquedaKeysValida(keysDelUser, condicionMongoDb.indicatorConfig.exchange);
                if (keyUsuarioObtenida) {
                  forkJoin([
                    this.exchangeCoordinator.returnAccountInfoFromSpecificExchange({
                      public: keyUsuarioObtenida.publicK,
                      private: keyUsuarioObtenida.privateK,
                      exchange: condicionMongoDb.indicatorConfig.exchange,
                    }),
                    this.exchangeCoordinator.returnExchangeInfoFromSpecificExchange(condicionMongoDb.indicatorConfig.exchange),
                  ]).subscribe(data => {
                    let cuenta: Account = data[0];
                    let exchangeInfo: ExchangeInfo = data[1];
                    //Obtenemos las posesiones del usuario en base al asset que elegió para "financiar" esta condicion
                    let posesionesActualesDelUsuario = cuenta.balances.find(
                      entry => entry.asset.toLowerCase() == configCondition.fundingAsset.toLowerCase(),
                    );

                    let datosExchangeAssetSobreActivoCondicionMain = exchangeInfo.symbols.find(
                      exchangeSymbol =>
                        exchangeSymbol.symbol.toLowerCase() == condicionMongoDb.indicatorConfig.historicParams.symbol.toLowerCase(),
                    );
                    observer.next([cuenta, exchangeInfo]);
                  });
                } else {
                  throw new HttpException(`No key found for the user ${condicionMongoDb.user}`, 404);
                }
              });
            } else {
              /* res.send({
                dembow: historicDataAndTechnical.extraData.technical.slice(
                  Math.max(historicDataAndTechnical.extraData.technical.length - 5, 0),
                ),
                dembow2: historicDataAndTechnical.extraData.historic.slice(
                  Math.max(historicDataAndTechnical.extraData.historic.length - 5, 0),
                ),
                dembow3: historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 2],
              });*/
              observer.next('jeioejiejie');
            }
          });
      });
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
