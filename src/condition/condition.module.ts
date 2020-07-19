import { Module } from '@nestjs/common';
import { ConditionController } from './condition.controller';
import { ConditionService } from './condition.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConditionInfoSchema, executedTradePositionInfo } from './schemas/Conditions.schema';
import { ExchangeCoordinatorModule } from '../exchange-coordinator/exchange-coordinator.module';
import { TechnicalIndicatorsModule } from '../technical-indicators/technical-indicators.module';
import { ConditionExcutionerService } from './services/condition-excutioner/condition-excutioner.service';
import { KeysModule } from '../keys/keys.module';
import { GeneralModule } from '../general/general.module';
import { ConditionRestService } from './services/condition-excutioner/condition-rest.service';

@Module({
  controllers: [ConditionController],
  imports: [
    ExchangeCoordinatorModule,
    TechnicalIndicatorsModule,
    KeysModule,
    GeneralModule,
    MongooseModule.forFeature([
      {
        name: 'ConditionPack',
        schema: ConditionInfoSchema,
        collection: 'ConditionList',
      },
      {
        name: 'ConditionLogs',
        schema: executedTradePositionInfo,
        collection: 'ConditionLogs',
      },
    ]),
  ],
  providers: [ConditionService, ConditionExcutionerService, ConditionRestService],
  exports: [ConditionService, ConditionExcutionerService, ConditionRestService],
})
export class ConditionModule {}
