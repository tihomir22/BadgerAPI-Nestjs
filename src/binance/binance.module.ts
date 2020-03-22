import { Module } from '@nestjs/common';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';
import { CryptoService } from 'src/crypto/crypto/crypto.service';

@Module({
  imports: [],
  controllers: [BinanceController],
  providers: [BinanceService,CryptoService],
  exports: [BinanceService],
})
export class BinanceModule {}
