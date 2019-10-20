import { Injectable, HttpException } from '@nestjs/common';
import Binance, { CandleChartInterval } from 'binance-api-node';

@Injectable()
export class BinanceService {
  private publicClient = Binance();

  public returnPing() {
    return this.publicClient.ping();
  }

  async returnHistoric(
    symbol: string,
    interval: CandleChartInterval,
    limit?: number,
  ) {
    if (symbol && interval) {
      try {
        return await this.publicClient.candles({
          symbol: symbol,
          interval: interval,
          limit: limit ? limit : 1000,
        });
      } catch (error) {
        throw new HttpException(
          'Binance error: ' +
            error +
            ' more info : https://github.com/binance-exchange/binance-official-api-docs/blob/master/errors.md',
          404,
        );
      }
    } else {
      throw new HttpException('You have introduced wrong parameters!', 404);
    }
  }
}
