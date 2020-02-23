import { Module } from '@nestjs/common';
import { ConditionController } from './condition.controller';
import { ConditionService } from './condition.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConditionInfoSchema } from './schemas/Conditions.schema';
import { ExchangeCoordinatorModule } from '../exchange-coordinator/exchange-coordinator.module';
import { TechnicalIndicatorsModule } from '../technical-indicators/technical-indicators.module';

@Module({
  controllers: [ConditionController],
  imports: [
    ExchangeCoordinatorModule,
    TechnicalIndicatorsModule,
    MongooseModule.forFeature([
      {
        name: 'ConditionPack',
        schema: ConditionInfoSchema,
        collection: 'ConditionList',
      },
    ]),
  ],
  providers: [ConditionService],
  exports: [ConditionService],
})
export class ConditionModule {}
