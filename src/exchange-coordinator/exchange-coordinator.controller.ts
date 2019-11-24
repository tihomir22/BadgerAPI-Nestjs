import {
  Controller,
  Get,
  Param,
  Res,
  HttpException,
  Put,
} from '@nestjs/common';
import { ExchangeCoordinatorService } from './exchange-coordinator';

@Controller('exchange-coordinator')
export class ExchangeCoordinatorController {
  constructor(private exchangeCordinatorService: ExchangeCoordinatorService) {}

  @Get('allExchanges')
  returnExchanges(@Res() res) {
    return this.exchangeCordinatorService.fetchAllExchanges(res);
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
