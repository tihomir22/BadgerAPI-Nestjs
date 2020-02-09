import { Module } from '@nestjs/common';
import { ConditionController } from './condition.controller';
import { ConditionService } from './condition.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConditionInfoSchema } from './schemas/Conditions.schema';

@Module({
  controllers: [ConditionController],
  imports: [
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
