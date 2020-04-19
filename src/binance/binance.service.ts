import { Injectable, HttpException, HttpService } from '@nestjs/common';
import Binance, { CandleChartInterval } from 'binance-api-node';
import {
  PrivateRequestsKeys,
  PrivateRequestsKeysWithSymbol,
  PrivateRequestsKeysWithSymbolAndOrderId,
  NewOrderModel,
  PrivateRequestsKeysWithDualSidePosition,
  BaseBinanceModel,
} from '../models/PrivateRequestsModel';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { HttpServiceCustom } from '../http/http.service';
import { map, mergeMap, catchError, timestamp } from 'rxjs/operators';
import { of } from 'rxjs';
@Injectable()
export class BinanceService {
  constructor(private crypto: CryptoService, private servicio: HttpServiceCustom) {}

  public returnPing() {
    let publicClient = Binance();
    return publicClient.ping();
  }

  public getAccountInfo(model: BaseBinanceModel) {
    let apiKey = this.crypto.decryptTXT(model.keys.public);
    let privateKey = this.crypto.decryptTXT(model.keys.private);
    let publicClient = Binance({ apiKey: apiKey, apiSecret: privateKey });
    return publicClient.accountInfo();
  }

  public async getTime() {
    return await this.servicio.http
      .get('https://api.binance.com/api/v1/time')
      .pipe(map(entry => entry.data.serverTime))
      .toPromise();
  }

  public getTimeAsObservable() {
    return this.servicio.http.get('https://api.binance.com/api/v1/time').pipe(map(entry => entry.data.serverTime));
  }

  public getFutureAccountInfo(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, '/fapi/v1/balance');
  }

  public async obtainOpenedOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, '/fapi/v1/positionRisk');
  }

  public obtainCurrentAllOpenOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, '/fapi/v1/openOrders');
  }

  public cancelAllOpenedOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestDELETE(model.keys, model.params, '/fapi/v1/allOpenOrders');
  }

  public changePositionMode(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestPOST(model.keys, model.params, '/fapi/v1/positionSide/dual');
  }

  async newOrder(keys: PrivateRequestsKeys, orderInfo: NewOrderModel) {
    let futuresInfo = await this.getFuturesExchangeInfo();
    let busqudaSimbolo = futuresInfo.symbols.find(symbol => symbol.symbol == orderInfo.symbol);
    if (busqudaSimbolo) {
      orderInfo.quantity = parseFloat(orderInfo.quantity.toFixed(busqudaSimbolo['quantityPrecision']));
      return this.executeBinancePrivateRequestPOST(keys, orderInfo, '/fapi/v1/order');
    } else {
      throw new HttpException(`The simbol ${orderInfo.symbol} is wrong`, 400);
    }
  }

  public queryOrder(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, '/fapi/v1/order');
  }

  async executeBinancePrivateRequestPOST(keys: PrivateRequestsKeys, extraParams: any, endPointUrl: string): Promise<any> {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';
    if (!extraParams) extraParams = {};
    let tiempo = await this.getTime();
    extraParams['timestamp'] = tiempo;
    extraParams['signature'] = this.crypto.generateBinanceSignature(this.generateQueryStringSignature(extraParams, tiempo), privateKey);

    return this.servicio.http
      .post(brul + endPointUrl, null, {
        params: extraParams,
        headers: { 'X-MBX-APIKEY': apiKey.trim() },
      })
      .pipe(map(entry => entry.data));
  }

  public async executeBinancePrivateRequestDELETE(keys: PrivateRequestsKeys, extraParams: any, endPointUrl: string) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';
    if (!extraParams) extraParams = {};
    let time = await this.getTime();
    extraParams['timestamp'] = time;
    extraParams['signature'] = this.crypto.generateBinanceSignature(this.generateQueryStringSignature(extraParams, time), privateKey);
    return this.servicio.http
      .delete(brul + endPointUrl, {
        params: extraParams,
        headers: { 'X-MBX-APIKEY': apiKey.trim() },
      })
      .pipe(map(entry => entry.data))
      .toPromise();
  }

  public async executeBinancePrivateRequestGET(keys: PrivateRequestsKeys, extraParams: any, endPointUrl: string) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = 'https://fapi.binance.com';
    if (!extraParams) extraParams = {};
    let time = await this.getTime();
    extraParams['timestamp'] = time;
    extraParams['signature'] = this.crypto.generateBinanceSignature(this.generateQueryStringSignature(extraParams, time), privateKey);

    return this.servicio.http
      .get(brul + endPointUrl, {
        params: extraParams,
        headers: { 'X-MBX-APIKEY': apiKey.trim() },
      })
      .pipe(map(entry => entry.data))
      .toPromise();
  }

  private generateQueryStringSignature(params: any, time: number) {
    let res = '';
    Object.keys(params).forEach(key => {
      if (res != '' && key != 'timestamp') {
        res = res + '&';
      }
      if (key != 'timestamp') {
        res = res + key + '=' + params[key];
      }
    });
    if (res != '') {
      res = res + '&timestamp=' + time;
    } else {
      res = 'timestamp=' + time;
    }
    return res;
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
