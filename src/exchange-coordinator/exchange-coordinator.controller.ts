import {
  Controller,
  Get,
  Param,
  Res,
  HttpException,
  Put,
  Body,
} from '@nestjs/common';
import { ExchangeCoordinatorService } from './exchange-coordinator';
import { ExchangeInfo } from './schemas/ExchangeInfo.schema';
import { find, map, take } from 'rxjs/operators';

@Controller('exchange-coordinator')
export class ExchangeCoordinatorController {
  constructor(private exchangeCordinatorService: ExchangeCoordinatorService) {}

  @Get('allExchanges')
  returnExchanges() {
    return this.exchangeCordinatorService.fetchAllExchanges();
  }

  @Put('addExchange')
  addExchange(@Body() newExchange: ExchangeInfo) {
    return this.exchangeCordinatorService.inserSomething(newExchange);
  }

  @Get('getAssets/:exchangeName')
  returnAssetsFromExchange(@Param('exchangeName') exchName) {
    return this.exchangeCordinatorService.returnAssetsFromSpecificExchange(
      exchName,
    );
  }

  @Get('fetchFullCMDDATA')
  returnCMCData() {
    return this.exchangeCordinatorService.fetchCMCFullData();
  }

  @Get('getExchangeIMG/:exchangeName')
  returnExchangeIMG(@Param('exchangeName') exchName) {
    return this.exchangeCordinatorService.getImageByName(exchName);
  }
}
