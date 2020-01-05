import { Controller, Get, Param } from '@nestjs/common';
import { CandleChartInterval } from 'binance-api-node';
import { BinanceService } from './binance.service';

@Controller('binance')
export class BinanceController {
  constructor(private binanceService: BinanceService) {}

  @Get()
  async ping() {
    return this.binanceService.returnPing();
  }

  @Get('historic/:symbol/:interval')
  getHistoricCandles(
    @Param('symbol') symbol: string,
    @Param('interval') interval: CandleChartInterval,
    @Param('limit') limit: number,
  ) {
    return this.binanceService.returnHistoric(symbol, interval, limit);
  }

  @Get('allBinanceAssets')
  getAllBinanceAssets(){
    return this.binanceService.returnAllAssets();
  }
}
