import { Controller, Post, Body, Get, Param, Res, HttpException, Delete } from '@nestjs/common';
import { ConditionPack, ChangeStateModel, ChangeFundingAsset, DeleteConditionsById } from './schemas/Conditions.schema';
import { ConditionService } from './condition.service';
import { forkJoin, Observable } from 'rxjs';
import { ConditionExcutionerService } from './services/condition-excutioner/condition-excutioner.service';
import { ConditionRestService } from './services/condition-excutioner/condition-rest.service';

@Controller('condition')
export class ConditionController {
  constructor(
    private conditionREST: ConditionRestService,
    private conditionService: ConditionService,
    private conditionExecutioner: ConditionExcutionerService,
  ) {}

  @Get('getAll')
  getAllConditions() {
    return this.conditionREST.returnAll();
  }

  @Get('getById/:id')
  getById(@Param('id') id) {
    return this.conditionREST.returnById(id);
  }

  @Delete('getById/:id')
  deletetById(@Param('id') id) {
    return this.conditionREST.deleteById(id);
  }

  @Post('addNew')
  addNewCondition(@Body() newCondition: ConditionPack) {
    return this.conditionREST.newWrapper(newCondition);
  }

  @Post('update')
  updateConditions(@Body() savingWrapper: ConditionPack) {
    return this.conditionREST.saveWrapper(savingWrapper);
  }

  @Post('backtest')
  backtestCondition(@Body() newCondition: ConditionPack) {
    return this.conditionService.backtestCondition(newCondition);
  }

  @Get('getByUser/:id')
  getConditionsByUser(@Param('id') id) {
    return this.conditionREST.recoverAllConditionsByUserId(id);
  }

  @Post('changeState')
  changeState(@Body() body: ChangeStateModel) {
    return this.conditionREST.changeState(body.id, body.state);
  }

  @Post('deleteConditionsById')
  deleteConditionsById(@Body() deleteContionsModel: DeleteConditionsById) {
    return this.conditionREST.deleteConditionsById(deleteContionsModel);
  }

  @Post('testOperation')
  test(@Res() res) {
    this.conditionREST.returnConditionsByTimeFrame('1h').then(data => {
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
