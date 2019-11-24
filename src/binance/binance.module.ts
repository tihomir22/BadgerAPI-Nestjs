import { Module } from '@nestjs/common';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';

@Module({
  imports: [],
  controllers: [BinanceController],
  providers: [BinanceService],
  exports: [BinanceService],
})
export class BinanceModule {}
