import { Module, MiddlewareConsumer, RequestMethod, HttpModule, HttpService } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TechnicalIndicatorsController } from './technical-indicators/technical-indicators.controller';
import { TechnicalIndicatorsService } from './technical-indicators/technical-indicators.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeCoordinatorModule } from './exchange-coordinator/exchange-coordinator.module';
import { JuicyData } from './ignorame';
import { RedireccionadorMiddleware } from './middlewares/redireccionador.middleware';
import { ConditionController } from './condition/condition.controller';
import { ConditionModule } from './condition/condition.module';
import { ScheduleModule } from '@nestjs/schedule';
import { KeysController } from './keys/keys.controller';
import { KeysModule } from './keys/keys.module';
import { CryptoService } from './crypto/crypto/crypto.service';

@Module({
  imports: [
    MongooseModule.forRoot(JuicyData.MONGODBSTRING, { useNewUrlParser: true }),
    ExchangeCoordinatorModule,
    ConditionModule,
    ScheduleModule.forRoot(),
    KeysModule,
  ],
  controllers: [AppController, TechnicalIndicatorsController, ConditionController, KeysController],
  providers: [AppService, TechnicalIndicatorsService, CryptoService],
})
export class AppModule {
  constructor() {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RedireccionadorMiddleware).forRoutes({ path: 'technical-indicators', method: RequestMethod.POST });
  }
}
