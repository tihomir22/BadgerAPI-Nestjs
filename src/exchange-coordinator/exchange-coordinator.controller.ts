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

  @Get('getExchangeIMG/:exchangeName')
  returnExchangeIMG(@Param('exchangeName') exchName, @Res() res) {
    return this.exchangeCordinatorService.returnFile(
      exchName,
      '.png',
      'src/assets',
      res,
    );
  }
}
