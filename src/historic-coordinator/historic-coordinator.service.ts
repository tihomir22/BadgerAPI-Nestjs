import { Injectable, HttpException } from '@nestjs/common';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { BinanceService } from '../binance/binance.service';

@Injectable()
export class HistoricCoordinatorService {
  constructor(private binance: BinanceService) {}

  async devolverHistoricoDependendiendoDelEXCHANGE(
    technicalPack: PaqueteIndicadorTecnico,
  ) {
    switch (technicalPack.exchange.toLowerCase()) {
      case 'binance':
        return await this.binance.returnHistoric(
          technicalPack.historicParams.symbol,
          technicalPack.historicParams.interval,
          technicalPack.historicParams.limit,
        );
      default:
        throw new HttpException(
          'The exchange ' + technicalPack.exchange + ' was not found!',
          404,
        );
    }
  }
}
