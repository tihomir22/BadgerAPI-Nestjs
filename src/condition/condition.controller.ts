import { Controller, Post, Body } from '@nestjs/common';
import { ConditionPack } from './schemas/Conditions.schema';
import { ConditionService } from './condition.service';

@Controller('condition')
export class ConditionController {
  constructor(private conditionService: ConditionService) {}

  @Post('addNew')
  addNewCondition(@Body() newCondition: ConditionPack) {
    return this.conditionService.guardarCondicion(newCondition);
  }
}
