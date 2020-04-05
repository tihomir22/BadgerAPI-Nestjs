import { Controller, Post, Body, Get, Param, Res, HttpException } from '@nestjs/common';
import { ConditionPack, ChangeStateModel, ChangeFundingAsset } from './schemas/Conditions.schema';
import { ConditionService } from './condition.service';
import { KeysService } from 'src/keys/keys.service';
import { BadgerUtils } from 'src/static/Utils';
import { ExchangeCoordinatorService } from 'src/exchange-coordinator/exchange-coordinator';
import { forkJoin, Observable } from 'rxjs';
import { Account, ExchangeInfo } from 'binance-api-node';
import { ConditionExcutionerService } from './services/condition-excutioner/condition-excutioner.service';

@Controller('condition')
export class ConditionController {
  constructor(private conditionService: ConditionService, private conditionExecutioner: ConditionExcutionerService) {}

  @Get('getAll')
  getAllConditions() {
    return this.conditionService.returnAll();
  }

  @Post('addNew')
  addNewCondition(@Body() newCondition: ConditionPack) {
    return this.conditionService.guardarCondicion(newCondition);
  }

  @Post('backtest')
  backtestCondition(@Body() newCondition: ConditionPack) {
    return this.conditionService.backtestCondition(newCondition);
  }

  @Get('getByUser/:id')
  getConditionsByUser(@Param('id') id) {
    return this.conditionService.recoverAllConditionsByUserId(id);
  }

  @Post('changeState')
  changeState(@Body() body: ChangeStateModel) {
    return this.conditionService.changeState(body.id, body.state);
  }

  @Post('changeFundingAsset')
  changeFundingAsset(@Body() body: ChangeFundingAsset) {
    return this.conditionService.changeFundingAsset(body.id, body.fundingAsset);
  }

  @Post('testOperation')
  test(@Res() res) {
    this.conditionService.returnConditionsByTimeFrame('1h').then(data => {
      new Observable(observer => {
        this.conditionExecutioner.executePreparations(data, observer);
      }).subscribe(data => {
        res.send(data);
      });
    });
  }
}
