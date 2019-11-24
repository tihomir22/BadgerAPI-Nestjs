import { Module } from '@nestjs/common';
import { ExchangeCoordinatorController } from './exchange-coordinator.controller';
import { ExchangeCoordinatorService } from './exchange-coordinator';
import { MongooseModule } from '@nestjs/mongoose';
import { ExchangeInfoSchema } from './schemas/ExchangeInfo.schema';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'ExchangeInfo',
        schema: ExchangeInfoSchema,
        collection: 'ExchangeList',
      },
    ]),
    BinanceModule,
  ],
  controllers: [ExchangeCoordinatorController],
  providers: [ExchangeCoordinatorService],
  exports: [ExchangeCoordinatorService],
})
export class ExchangeCoordinatorModule {}
