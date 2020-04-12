import { Module } from '@nestjs/common';
import { BinanceController } from './binance.controller';
import { BinanceService } from './binance.service';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { HttpModuleCustom } from '../http/http.module';

@Module({
  imports: [HttpModuleCustom],
  controllers: [BinanceController],
  providers: [BinanceService, CryptoService],
  exports: [BinanceService],
})
export class BinanceModule {}
