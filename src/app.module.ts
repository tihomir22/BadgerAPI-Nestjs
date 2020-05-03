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
import { GeneralModule } from './general/general.module';
import * as webpush from 'web-push';
import { GeneralService } from './general/general.service';

@Module({
  imports: [
    MongooseModule.forRoot(JuicyData.MONGODBSTRING, { useNewUrlParser: true }),
    ExchangeCoordinatorModule,
    ConditionModule,
    ScheduleModule.forRoot(),
    KeysModule,
    GeneralModule,
  ],
  controllers: [AppController, TechnicalIndicatorsController, ConditionController, KeysController],
  providers: [AppService, TechnicalIndicatorsService, CryptoService],
})
export class AppModule {
  constructor(private general: GeneralService) {
    this.webPushConfig();
  }

  webPushConfig() {
    webpush.setVapidDetails('mailto:tihomir_alcudia3@hotmail.com', process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
    this.general.setWebpushConfig(webpush);
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RedireccionadorMiddleware).forRoutes({ path: 'technical-indicators', method: RequestMethod.POST });
  }
}
