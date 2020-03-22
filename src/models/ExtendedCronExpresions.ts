import { CronExpression } from '@nestjs/schedule';

export enum ExtendedCronExpresionsModel {
  EVERY_3_MINUTES = '0 */3 * * * *',
}
