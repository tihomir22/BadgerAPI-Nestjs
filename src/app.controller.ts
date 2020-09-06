import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { ConditionExcutionerService } from './condition/services/condition-excutioner/condition-excutioner.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private conditionExecutioner: ConditionExcutionerService) {}

  @Post('inserTrade') inserTrade(@Body() body) {
    return this.conditionExecutioner.inserTradeLog({ side: 'SELL' }, 'binance', 8000, Date.now());
  }

  @Post('closeTrade') closeTrade(@Body() body) {
    return this.conditionExecutioner.changeStatusOfLog('cerrado', '5ea5645ac8db2818bcf062ff', {
      closePrice: 8500,
      closeTime: Date.now(),
    });
  }

  @Get('/') hello() {
    return 'hello!';
  }
}
