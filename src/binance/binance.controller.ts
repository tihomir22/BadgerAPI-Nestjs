import { Controller, Get, Param, Body, Post, Res } from '@nestjs/common';
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
  getHistoricCandles(@Param('symbol') symbol: string, @Param('interval') interval: CandleChartInterval, @Param('limit') limit: number) {
    return this.binanceService.returnHistoric(symbol, interval, limit);
  }

  @Get('allBinanceAssets')
  getAllBinanceAssets() {
    return this.binanceService.returnAllAssets();
  }

  @Post('getAccountInfo')
  getAccountInfo(@Body() body) {
    return this.binanceService.getAccountInfo(body);
  }

  @Post('getFuturesAccountInfo')
  getFuturesAccountInfo(@Body() body) {
    return this.binanceService.getFutureAccountInfo(body);
  }

  @Post('cancelOpenedOrders')
  cancelOpenedOrders(@Body() body) {
    return this.binanceService.cancelAllOpenedOrders(body);
  }

  @Post('queryOrder')
  queryOrder(@Body() body) {
    return this.binanceService.queryOrder(body);
  }

  @Post('obtainCurrentAllOpenOrders')
  obtainCurrentAllOpenOrders(@Body() body) {
    return this.binanceService.obtainCurrentAllOpenOrders(body);
  }

  @Post('getOpenedOrders')
  getOpenedOrders(@Body() body) {
    return this.binanceService.obtainOpenedOrders(body);
  }

  @Post('newOrder')
  newOrder(@Body() body) {
    return this.binanceService.newOrder(body.keys, body.params);
  }

  @Post('changePositionMode')
  changePositionMode(@Body() body) {
    return this.binanceService.changePositionMode(body);
  }
}
