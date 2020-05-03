import { Controller, Get, Post, Body, HttpException } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';

@Controller('technical-indicators')
export class TechnicalIndicatorsController {
  constructor(private tulip: TechnicalIndicatorsService, private historic: ExchangeCoordinatorService) {}

  @Get()
  getTulipVersion() {
    return this.tulip.getVersion();
  }

  @Get('/all')
  getAllIndicators() {
    return this.tulip.returnCustomIndicators();
  }

  @Post()
  async resolveTechnicalIndicator(@Body() technicalPack: PaqueteIndicadorTecnico) {
    let historico: Array<any> = await this.historic.devolverHistoricoDependendiendoDelEXCHANGE(technicalPack);
    return this.tulip.evaluateIndicator(technicalPack.indicatorParams, historico);
  }
}
