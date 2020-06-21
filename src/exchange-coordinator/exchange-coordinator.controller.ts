import { Controller, Get, Param, Res, HttpException, Put, Body, Header, Post } from '@nestjs/common';
import { ExchangeCoordinatorService } from './exchange-coordinator';
import { ExchangeInfo } from './schemas/ExchangeInfo.schema';
import { PrivateRequestsKeysWithExchange } from 'src/models/PrivateRequestsModel';

@Controller('exchange-coordinator')
export class ExchangeCoordinatorController {
  constructor(private exchangeCordinatorService: ExchangeCoordinatorService) {}

  @Get('allExchanges')
  returnExchanges() {
    return this.exchangeCordinatorService.fetchAllExchanges();
  }

  @Get('getExchangeById/:exchangeName')
  getExchangeById(@Param('exchangeName') exchangeName) {
    return this.exchangeCordinatorService.getByID(exchangeName);
  }

  @Put('addExchange')
  addExchange(@Body() newExchange: ExchangeInfo) {
    return this.exchangeCordinatorService.inserSomething(newExchange);
  }

  @Post('getAccountInfo')
  getAccountInfo(@Body() data: PrivateRequestsKeysWithExchange) {
    return this.exchangeCordinatorService.returnAccountInfoFromSpecificExchange(data);
  }

  @Post('getFuturesAccountInfo')
  getFuturesAccountInfo(@Body() data: PrivateRequestsKeysWithExchange) {
    return this.exchangeCordinatorService.returnFuturesAccountInfoFromSpecificExchange(data);
  }

  @Get('getAssets/:exchangeName')
  returnAssetsFromExchange(@Param('exchangeName') exchName) {
    return this.exchangeCordinatorService.returnAssetsFromSpecificExchange(exchName);
  }

  @Get('getFutureAssets/:exchangeName')
  returnFutureAssetsFromExchange(@Param('exchangeName') exchName) {
    return this.exchangeCordinatorService.returnFutureAssetsFromSpecificExchange(exchName);
  }

  @Get('fetchFullCMDDATA')
  returnCMCData() {
    return this.exchangeCordinatorService.fetchCMCFullData();
  }

  @Get('getExchangeIMG/:exchangeName/:size')
  @Header('Content-Type', 'application/json')
  returnExchangeIMGBase64(@Param('exchangeName') exchName, @Param('size') size, @Res() res) {
    return this.exchangeCordinatorService.getImageByName(exchName, res, size);
  }
}
