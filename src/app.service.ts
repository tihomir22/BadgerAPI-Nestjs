import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConditionService } from './condition/condition.service';
import { ExtendedCronExpresionsModel } from './models/ExtendedCronExpresions';
import { GeneralService } from './general/general.service';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConditionExcutionerService } from './condition/services/condition-excutioner/condition-excutioner.service';
import { ConditionRestService } from './condition/services/condition-excutioner/condition-rest.service';
import { FullConditionsModel, ConditionPack } from './condition/schemas/Conditions.schema';
export type CronTypeTime = '5s' | '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private condicionService: ConditionRestService, private conditionExecutioner: ConditionExcutionerService) {}

  /*  //Used to check live conditions
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleCron5SECS() {
    this.handleCronByTimeFrame('5s', 'LIVE');
  }*/

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron1MIN() {
    this.handleCronByTimeFrame('1m', '1 minute');
  }

  @Cron(ExtendedCronExpresionsModel.EVERY_3_MINUTES)
  handleCron3MIN() {
    this.handleCronByTimeFrame('3m', '3 minutes');
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron5MIN() {
    this.handleCronByTimeFrame('5m', '5 minutes');
  }

  @Cron(CronExpression.EVERY_15_MINUTES)
  handleCron15MIN() {
    this.handleCronByTimeFrame('15m', '15 minutes');
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  handleCron30MIN() {
    this.handleCronByTimeFrame('30m', '30 minutes');
  }

  @Cron(CronExpression.EVERY_HOUR)
  handleCron1h() {
    this.handleCronByTimeFrame('1h', '1 Hour');
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  handleCron2h() {
    this.handleCronByTimeFrame('2h', '2 Hours');
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  handleCron4h() {
    this.handleCronByTimeFrame('4h', '4 Hours');
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  handleCron6h() {
    this.handleCronByTimeFrame('6h', '6 Hours');
  }

  @Cron(CronExpression.EVERY_8_HOURS)
  handleCron8h() {
    this.handleCronByTimeFrame('8h', '8 Hours');
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  handleCron12h() {
    this.handleCronByTimeFrame('12h', '12 Hours');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDay() {
    this.handleCronByTimeFrame('1d', '1 Day');
  }

  private handleCronByTimeFrame(timeFrame: CronTypeTime, prefixToShow: string) {
    this.condicionService.returnConditionsByTimeFrame(timeFrame).then(data => {
      this.logger.debug(prefixToShow + ' conditions ' + data.length);
      this.realizarComprobacionesCondiciones(data, prefixToShow);
    });
  }

  private realizarComprobacionesCondiciones(data: Array<ConditionPack>, prefixToShow: string) {
    /*if (data.length > 0) {
      new Observable(observer => {
        this.conditionExecutioner.executePreparations(data, observer);
      }).subscribe(data => {
        this.logger.debug(prefixToShow + '=> La ejecución ha terminado');
      });
    }*/
  }
}
