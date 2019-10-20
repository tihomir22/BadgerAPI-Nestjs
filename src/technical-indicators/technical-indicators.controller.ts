import { Controller, Get, Post, Body, HttpException } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { HistoricCoordinatorService } from '../historic-coordinator/historic-coordinator.service';

@Controller('technical-indicators')
export class TechnicalIndicatorsController {
  constructor(
    private tulip: TechnicalIndicatorsService,
    private historic: HistoricCoordinatorService,
  ) {}

  @Get()
  getTulipVersion() {
    return this.tulip.getVersion();
  }

  @Get('/all')
  getAllIndicators() {
    return this.tulip.getClient().indicators;
  }

  @Post()
  async resolveTechnicalIndicator(
    @Body() technicalPack: PaqueteIndicadorTecnico,
  ) {
    let historico: Array<
      any
    > = await this.historic.devolverHistoricoDependendiendoDelEXCHANGE(
      technicalPack,
    );
    return this.tulip.evaluateIndicator(
      technicalPack.indicatorParams,
      historico,
    );
  }
}
