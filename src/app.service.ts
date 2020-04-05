import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConditionService } from './condition/condition.service';
import { ExtendedCronExpresionsModel } from './models/ExtendedCronExpresions';
import { timer } from 'rxjs';
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(private condicionService: ConditionService) {
  }

  @Cron(CronExpression.EVERY_MINUTE)
  handleCron1MIN() {
    this.condicionService.returnConditionsByTimeFrame('1m').then(data => {
      this.logger.debug('1 minute conditions ' + data.length);
    });
  }

  @Cron(ExtendedCronExpresionsModel.EVERY_3_MINUTES)
  handleCron3MIN() {
    this.condicionService.returnConditionsByTimeFrame('3m').then(data => {
      this.logger.debug('3 minute conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron5MIN() {
    this.condicionService.returnConditionsByTimeFrame('5m').then(data => {
      this.logger.debug('5 minute conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_15_MINUTES)
  handleCron15MIN() {
    this.condicionService.returnConditionsByTimeFrame('15m').then(data => {
      this.logger.debug('15 minutes conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  handleCron30MIN() {
    this.condicionService.returnConditionsByTimeFrame('30m').then(data => {
      this.logger.debug('30 minutes conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  handleCron1h() {
    this.condicionService.returnConditionsByTimeFrame('1h').then(data => {
      this.logger.debug('1hour conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  handleCron2h() {
    this.condicionService.returnConditionsByTimeFrame('2h').then(data => {
      this.logger.debug('2hours conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_4_HOURS)
  handleCron4h() {
    this.condicionService.returnConditionsByTimeFrame('4h').then(data => {
      this.logger.debug('4hours conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  handleCron6h() {
    this.condicionService.returnConditionsByTimeFrame('6h').then(data => {
      this.logger.debug('6hours conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_8_HOURS)
  handleCron8h() {
    this.condicionService.returnConditionsByTimeFrame('8h').then(data => {
      this.logger.debug('8hours conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  handleCron12h() {
    this.condicionService.returnConditionsByTimeFrame('12h').then(data => {
      this.logger.debug('12hours conditions ' + data.length);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleDay() {
    this.condicionService.returnConditionsByTimeFrame('1d').then(data => {
      this.logger.debug('1d conditions ' + data.length);
    });
  }

  public getHello() {
    return 'e';
  }
}
