import { Controller, Get, Post, Body, HttpException, Param } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { ExchangeCoordinatorService } from '../exchange-coordinator/exchange-coordinator';
import { ConditionPack } from 'src/condition/schemas/Conditions.schema';

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

  @Get('/byName/:name')
  getByName(@Param('name') name: string) {
    return this.tulip.returnByName(name);
  }

  @Post()
  async resolveTechnicalIndicator(@Body() conditionPack: ConditionPack) {
    let historico: Array<any> = await this.historic.devolverHistoricoDependendiendoDelEXCHANGE(conditionPack.generalConfig);
    console.log('whoop');
    return this.tulip.evaluateIndicator(conditionPack.conditionConfig[0].indicatorConfig[0].indicatorParams, historico);
  }
}
