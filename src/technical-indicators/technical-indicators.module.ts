import { Module } from '@nestjs/common';
import { TechnicalIndicatorsService } from './technical-indicators.service';
import { TechnicalIndicatorsController } from './technical-indicators.controller';
import { ExchangeCoordinatorModule } from 'src/exchange-coordinator/exchange-coordinator.module';

@Module({
  imports: [ExchangeCoordinatorModule],
  controllers: [TechnicalIndicatorsController],
  providers: [TechnicalIndicatorsService],
  exports: [TechnicalIndicatorsService],
})
export class TechnicalIndicatorsModule {}
