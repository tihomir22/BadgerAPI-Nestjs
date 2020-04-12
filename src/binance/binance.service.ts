import { Injectable, HttpException, HttpService } from '@nestjs/common';
import Binance, { CandleChartInterval } from 'binance-api-node';
import {
  PrivateRequestsKeys,
  PrivateRequestsKeysWithSymbol,
  PrivateRequestsKeysWithSymbolAndOrderId,
} from '../models/PrivateRequestsModel';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { of, Observable } from 'rxjs';
import { HttpServiceCustom } from '../http/http.service';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { clone } from 'lodash';
import { FuturesAccountInfo } from 'src/models/FuturesAccountInfo';
@Injectable()
export class BinanceService {
  constructor(private crypto: CryptoService, private servicio: HttpServiceCustom) {}

  public returnPing() {
    let publicClient = Binance();
    return publicClient.ping();
  }

  async getAccountInfo(keys: PrivateRequestsKeys) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let publicClient = Binance({ apiKey: apiKey, apiSecret: privateKey });
    return await publicClient.accountInfo();
  }

  public getTime() {
    return this.servicio.http.get('https://api.binance.com/api/v1/time').pipe(map(entry => entry.data.serverTime));
  }

  public getFutureAccountInfo(keys: PrivateRequestsKeys): Observable<FuturesAccountInfo> {
    return this.executeBinancePrivateRequestGET(keys, '/fapi/v1/balance').pipe(
      map(entry => {
        return {
          listaAssets: entry,
        };
      }),
    );
  }

  public obtainOpenedOrders(keys: PrivateRequestsKeys): Observable<any> {
    return this.executeBinancePrivateRequestGET(keys, '/fapi/v1/positionRisk');
  }

  public cancelAllOpenedOrders(keys: PrivateRequestsKeysWithSymbol): Observable<any> {
    return this.cancelAllOpenOrdersBySymbol(keys, '/fapi/v1/allOpenOrders');
  }

  public cancelOrder(keys: PrivateRequestsKeysWithSymbolAndOrderId) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';

    let keysForQuery = {
      akey: apiKey,
      skey: privateKey,
    };

    this.getTime()
      .pipe(
        mergeMap(respuesta => {
          return this.servicio.http
            .delete(brul + '/fapi/v1/order', {
              params: {
                symbol: keys.symbol.trim(),
                orderId: keys.orderId,
                timestamp: respuesta,
                signature: this.crypto.generateBinanceSignature(
                  `symbol=${keys.symbol}&orderId=${keys.orderId}&timestamp=${respuesta}`,
                  keysForQuery.skey,
                ),
              },
              headers: { 'X-MBX-APIKEY': keysForQuery.akey.trim() },
            })
            .pipe(
              map((entry: any) => entry.data),
              catchError(error => of(error.response.data)),
            );
        }),
      )
      .subscribe(
        data => {
          console.log(data,keys.orderId);
        },
        error => {
          console.log(error,keys.orderId);
        },
      );
  }

  public getAllOrders(keys: PrivateRequestsKeysWithSymbol): Observable<any> {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';

    let keysForQuery = {
      akey: apiKey,
      skey: privateKey,
    };

    return this.getTime().pipe(
      mergeMap(respuesta => {
        return this.servicio.http
          .get(brul + '/fapi/v1/allOrders', {
            params: {
              symbol: keys.symbol.trim(),
              timestamp: respuesta,
              signature: this.crypto.generateBinanceSignature(`symbol=${keys.symbol}&timestamp=` + respuesta, keysForQuery.skey),
            },
            headers: { 'X-MBX-APIKEY': keysForQuery.akey.trim() },
          })
          .pipe(map((entry: any) => entry.data));
      }),
    );
  }

  public cancelAllOpenOrdersBySymbol(keys: PrivateRequestsKeysWithSymbol, endPointUrl: string) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';

    let keysForQuery = {
      akey: apiKey,
      skey: privateKey,
    };

    return this.getTime().pipe(
      mergeMap(respuesta => {
        return this.servicio.http
          .delete(brul + endPointUrl, {
            params: {
              symbol: keys.symbol.trim(),
              timestamp: respuesta,
              signature: this.crypto.generateBinanceSignature(`symbol=${keys.symbol}&timestamp=` + respuesta, keysForQuery.skey),
            },
            headers: { 'X-MBX-APIKEY': keysForQuery.akey.trim() },
          })
          .pipe(map((entry: any) => entry.data));
      }),
    );
  }

  public executeBinancePrivateRequestGET(keys: PrivateRequestsKeys, endPointUrl: string) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';

    let keysForQuery = {
      akey: apiKey,
      skey: privateKey,
    };

    return this.getTime().pipe(
      mergeMap(respuesta => {
        return this.servicio.http
          .get(brul + endPointUrl, {
            params: {
              timestamp: respuesta,
              signature: this.crypto.generateBinanceSignature('timestamp=' + respuesta, keysForQuery.skey),
            },
            headers: { 'X-MBX-APIKEY': keysForQuery.akey.trim() },
          })
          .pipe(map((entry: any) => entry.data));
      }),
    );
  }

  async getExchangeInfo() {
    return await Binance().exchangeInfo();
  }
  async getFuturesExchangeInfo() {
    return await Binance().futuresExchangeInfo();
  }

  async returnFuturePrice(asset: string) {
    let precios: any = await Binance().futuresPrices();
    return precios[asset];
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

  async returnAllFutureAssets() {
    let publicClient = Binance();
    try {
      return (await publicClient.futuresExchangeInfo()).symbols
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
