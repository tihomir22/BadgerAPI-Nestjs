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
  getAccountInfo(@Body() body, @Res() res) {
    return this.binanceService.getAccountInfo(body);
  }

  @Post('getFuturesAccountInfo')
  getFuturesAccountInfo(@Body() body) {
    return this.binanceService.getFutureAccountInfo(body);
  }

  @Post('getOpenedOrders')
  getOpenedOrders(@Body() body) {
    return this.binanceService.obtainOpenedOrders(body);
  }

  @Post('cancelOpenedOrders')
  cancelOpenedOrders(@Body() body) {
    return this.binanceService.cancelAllOpenedOrders(body);
  }

  @Post('getAllOrders')
  getAllOrders(@Body() body) {
    return this.binanceService.getAllOrders(body);
  }

  @Post('cancelOrderById')
  cancelOrderById(@Body() body) {
    return this.binanceService.cancelOrder(body);
  }
}
