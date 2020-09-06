import { Injectable, HttpException, HttpService } from '@nestjs/common';
import Binance, { CandleChartInterval, Symbol } from 'binance-api-node';
import {
  PrivateRequestsKeys,
  PrivateRequestsKeysWithSymbol,
  PrivateRequestsKeysWithSymbolAndOrderId,
  NewOrderModel,
  PrivateRequestsKeysWithDualSidePosition,
  BaseBinanceModel,
  PrivateRequestsKeysWithExchangeAndTestnetFlag,
} from '../models/PrivateRequestsModel';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { HttpServiceCustom } from '../http/http.service';
import { map, mergeMap, catchError, timestamp } from 'rxjs/operators';
import { of } from 'rxjs';
import { BadgerUtils } from '../static/Utils';

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
    let publicClient = Binance({
      apiKey: apiKey,
      apiSecret: privateKey,
    });
    return publicClient.accountInfo({ useServerTime: true });
  }

  public getFutureAccountInfo(model: PrivateRequestsKeysWithExchangeAndTestnetFlag) {
    return this.executeBinancePrivateRequestGET(
      { public: model.public, private: model.private },
      undefined,
      `/fapi/${BadgerUtils.VERSION_ON_USE}/balance`,
      model.isTestnet,
    );
  }

  public async getTime() {
    return await this.servicio.http
      .get(`https://api.binance.com/api/v1/time`)
      .pipe(map(entry => entry.data.serverTime))
      .toPromise();
  }

  public getTimeAsObservable() {
    return this.servicio.http
      .get(`https://api.binance.com/api/${BadgerUtils.VERSION_ON_USE}/time`)
      .pipe(map(entry => entry.data.serverTime));
  }

  public async obtainOpenedOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, `/fapi/${BadgerUtils.VERSION_ON_USE}/positionRisk`);
  }

  public obtainCurrentAllOpenOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, `/fapi/${BadgerUtils.VERSION_ON_USE}/openOrders`);
  }

  public cancelAllOpenedOrders(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestDELETE(model.keys, model.params, `/fapi/${BadgerUtils.VERSION_ON_USE}/allOpenOrders`);
  }

  public changePositionMode(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestPOST(model.keys, model.params, `/fapi/${BadgerUtils.VERSION_ON_USE}/positionSide/dual`);
  }

  async newOrder(keys: PrivateRequestsKeys, orderInfo: NewOrderModel) {
    let futuresInfo = await this.getFuturesExchangeInfo();
    let busqudaSimbolo = futuresInfo.symbols.find(symbol => symbol.symbol == orderInfo.symbol);
    if (busqudaSimbolo) {
      orderInfo.quantity = parseFloat(orderInfo.quantity.toFixed(busqudaSimbolo['quantityPrecision']));
      return this.executeBinancePrivateRequestPOST(keys, orderInfo, `/fapi/${BadgerUtils.VERSION_ON_USE}/order`);
    } else {
      throw new HttpException(`The simbol ${orderInfo.symbol} is wrong`, 400);
    }
  }

  public queryOrder(model: BaseBinanceModel) {
    return this.executeBinancePrivateRequestGET(model.keys, model.params, `/fapi/${BadgerUtils.VERSION_ON_USE}/order`);
  }

  async executeBinancePrivateRequestPOST(
    keys: PrivateRequestsKeys,
    extraParams: any,
    endPointUrl: string,
    isTestnet?: boolean,
  ): Promise<any> {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = BadgerUtils.GET_BINANCE_FUTURES_ENDPOINT(isTestnet);
    if (!extraParams) extraParams = {};
    let tiempo = await this.getTime();
    extraParams['timestamp'] = tiempo;
    extraParams['signature'] = this.crypto.generateBinanceSignature(this.generateQueryStringSignature(extraParams, tiempo), privateKey);

    return this.servicio.http
      .post(brul + endPointUrl, null, {
        params: extraParams,
        headers: { 'X-MBX-APIKEY': apiKey.trim() },
      })
      .pipe(map(entry => entry.data))
      .toPromise()
      .catch(err => {
        throw new HttpException(err.message, err.response.status);
      });
  }

  public async executeBinancePrivateRequestDELETE(keys: PrivateRequestsKeys, extraParams: any, endPointUrl: string, isTestnet?: boolean) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = BadgerUtils.GET_BINANCE_FUTURES_ENDPOINT(isTestnet);
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
      .toPromise()
      .catch(err => {
        throw new HttpException(err.message, err.response.status);
      });
  }

  public async executeBinancePrivateRequestGET(keys: PrivateRequestsKeys, extraParams: any, endPointUrl: string, isTestnet?: boolean) {
    let apiKey = this.crypto.decryptTXT(keys.public);
    let privateKey = this.crypto.decryptTXT(keys.private);
    let brul = BadgerUtils.GET_BINANCE_FUTURES_ENDPOINT(isTestnet);
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
      .toPromise()
      .catch(err => {
        throw new HttpException(err.response.data.msg, err.response.status);
      });
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
      return this.filterBrokenAssetsAndMap((await publicClient.exchangeInfo()).symbols);
    } catch (error) {
      this.throwBinanceError(error);
    }
  }

  async returnAllFutureAssets() {
    let publicClient = Binance();
    try {
      return this.filterBrokenAssetsAndMap((await publicClient.futuresExchangeInfo()).symbols);
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

  private filterBrokenAssetsAndMap(assets: Array<Symbol>) {
    return assets
      .filter(symbol => symbol.status != 'BREAK')
      .map(symbolFiltered => {
        return {
          symbol: symbolFiltered.symbol,
          estado: symbolFiltered.status,
          parBase: symbolFiltered.baseAsset,
          parContra: symbolFiltered.quoteAsset,
        };
      });
  }
}
