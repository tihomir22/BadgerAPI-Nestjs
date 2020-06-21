import { Controller, Post, Body, Get, Param, Res, HttpException, Delete } from '@nestjs/common';
import { ConditionPack, ChangeStateModel, ChangeFundingAsset, DeleteConditionsById } from './schemas/Conditions.schema';
import { ConditionService } from './condition.service';
import { forkJoin, Observable } from 'rxjs';
import { ConditionExcutionerService } from './services/condition-excutioner/condition-excutioner.service';

@Controller('condition')
export class ConditionController {
  constructor(private conditionService: ConditionService, private conditionExecutioner: ConditionExcutionerService) {}

  @Get('getAll')
  getAllConditions() {
    return this.conditionService.returnAll();
  }

  @Get('getById/:id')
  getById(@Param('id') id) {
    return this.conditionService.returnById(id);
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

  @Post('deleteConditionsById')
  deleteConditionsById(@Body() deleteContionsModel: DeleteConditionsById) {
    return this.conditionService.deleteConditionsById(deleteContionsModel);
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

  /*@Post('changeFundingAsset')
  changeFundingAsset(@Body() body: ChangeFundingAsset) {
    return this.conditionService.changeFundingAsset(body.id, body.fundingAsset);
  }*/
}
