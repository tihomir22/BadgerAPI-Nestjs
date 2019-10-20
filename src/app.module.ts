import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceController } from './binance/binance.controller';
import { BinanceService } from './binance/binance.service';
import { TechnicalIndicatorsController } from './technical-indicators/technical-indicators.controller';
import { TechnicalIndicatorsService } from './technical-indicators/technical-indicators.service';
import { RedireccionadorMiddleware } from './redireccionador.middleware';
import { HistoricCoordinatorService } from './historic-coordinator/historic-coordinator.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    BinanceController,
    TechnicalIndicatorsController,
  ],
  providers: [
    AppService,
    BinanceService,
    TechnicalIndicatorsService,
    HistoricCoordinatorService,
  ],
})
export class AppModule {
  constructor(private technical: TechnicalIndicatorsService) {
    let objetoPadre = this.technical.getClient().indicators;
    let keys = Object.keys(objetoPadre);
    let totales = keys.map(key => objetoPadre[key].name);
    let copiaTotales = JSON.parse(JSON.stringify(totales));
    //BUGGEADOS => ACOS,ASIN,COSH
    [
      'sma',
      'ema',
      'wma',
      'dema',
      'tema',
      'trima',
      'kama',
      'hma',
      'zlema',
      'vwma',
      'adosc',
      'adx',
      'abs',
      'ad',
      'add',
      'adxr',
      'ao',
      'apo',
      'aroon',
      'aroonosc',
      'atan',
      'atr',
      'avgprice',
      'bbands',
      'bop',
      'cci',
      'ceil',
      'cmo',
      'cos',
      'crossany',
      'crossover',
      'cvi',
      'decay',
      'di',
      'div',
      'dm',
      'dpo',
      'edecay',
      'emv',
      'exp',
    ].forEach(data => {
      copiaTotales.splice(copiaTotales.indexOf(data), 1);
    });
    console.log('TODOS ' + totales.length);
    console.log('IMPLEMENTADOS ' + (totales.length - copiaTotales.length));
    console.log('TE QUEDAN ' + copiaTotales.length);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RedireccionadorMiddleware)
      .forRoutes({ path: 'technical-indicators', method: RequestMethod.POST });
  }
}
