import { Injectable, HttpException } from '@nestjs/common';
import Binance, { CandleChartInterval } from 'binance-api-node';
import { PrivateRequestsKeys } from 'src/models/PrivateRequestsModel';
import { CryptoService } from 'src/crypto/crypto/crypto.service';
@Injectable()
export class BinanceService {
  constructor(private crypto: CryptoService) {}

  public returnPing() {
    let publicClient = Binance();
    return publicClient.ping();
  }

  async getAccountInfo(keys: PrivateRequestsKeys, res: any) {
    try {
      let publicClient = Binance({ apiKey: this.crypto.decryptTXT(keys.public), apiSecret: this.crypto.decryptTXT(keys.private) });
      let accountDetails = await publicClient.accountInfo();
      res.send(accountDetails);
    } catch (error) {
      res.status(400).send(new HttpException(error.message, 400));
    }
  }

  async returnAllAssets() {
    let publicClient = Binance();
    try {
      return (await publicClient.exchangeInfo()).symbols
        .filter(symbol => symbol.status != 'BREAK')
        .map(simbolo => {
          return {
            symbol: simbolo.symbol,
            estado: simbolo.status,
            parBase: simbolo.baseAsset,
            parContra: simbolo.quoteAsset,
          };
        });
    } catch (error) {
      this.throwBinanceError(error);
    }
  }

  async returnHistoric(symbol: string, interval: CandleChartInterval, limit?: number) {
    let publicClient = Binance();
    if (symbol && interval) {
      try {
        return await publicClient.candles({
          symbol: symbol,
          interval: interval,
          limit: limit ? limit : 1000,
        });
      } catch (error) {
        this.throwBinanceError(error);
      }
    } else {
      throw new HttpException('You have introduced wrong parameters!', 404);
    }
  }

  private throwBinanceError(error) {
    throw new HttpException(
      'Binance error: ' + error + ' more info : https://github.com/binance-exchange/binance-official-api-docs/blob/master/errors.md',
      404,
    );
  }
}
