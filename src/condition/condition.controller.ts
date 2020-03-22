import { Controller, Post, Body, Get, Param, Res } from '@nestjs/common';
import { ConditionPack, ChangeStateModel } from './schemas/Conditions.schema';
import { ConditionService } from './condition.service';

@Controller('condition')
export class ConditionController {
  constructor(private conditionService: ConditionService) {}

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

  @Post('testOperation')
  test(@Res() res) {
    this.conditionService.returnConditionsByTimeFrame('1h').then(data => {
      data.forEach(condicionMongoDb => {
        this.conditionService.getLatestTechnicalAndHistoricDataFromCondition(condicionMongoDb).then(historicDataAndTechnical => {
          condicionMongoDb.conditionConfig.forEach(configCondition => {
            console.log(historicDataAndTechnical.extraData.technical);
            console.log(historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 1]);
            console.log(
              this.conditionService.detectIfConditionIsAccomplishedWithSingleEntry(
                configCondition,
                historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 1],
                false,
              ),
            );
          });
          res.send({
            dembow: historicDataAndTechnical.extraData.technical.slice(
              Math.max(historicDataAndTechnical.extraData.technical.length - 5, 0),
            ),
            dembow2: historicDataAndTechnical.extraData.historic.slice(Math.max(historicDataAndTechnical.extraData.historic.length - 5, 0)),
            dembow3: historicDataAndTechnical.extraData.technical[historicDataAndTechnical.extraData.technical.length - 2],
          });
        });
      });
    });
  }
}
