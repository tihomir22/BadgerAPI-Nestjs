import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceController } from './binance/binance.controller';
import { BinanceService } from './binance/binance.service';
import { TechnicalIndicatorsController } from './technical-indicators/technical-indicators.controller';
import { TechnicalIndicatorsService } from './technical-indicators/technical-indicators.service';
import { RedireccionadorMiddleware } from './redireccionador.middleware';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeCoordinatorModule } from './exchange-coordinator/exchange-coordinator.module';
import { JuicyData } from './ignorame';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MongooseModule.forRoot(JuicyData.MONGODBSTRING, { useNewUrlParser: true }),
    ExchangeCoordinatorModule,
    /*  MulterModule.register({
      dest: './src/assets',
    }),*/
  ],
  controllers: [
    AppController,
    BinanceController,
    TechnicalIndicatorsController,
  ],
  providers: [AppService, BinanceService, TechnicalIndicatorsService],
})
export class AppModule {
  constructor() {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RedireccionadorMiddleware)
      .forRoutes({ path: 'technical-indicators', method: RequestMethod.POST });
  }
}
