import { Injectable, HttpException, HttpService } from '@nestjs/common';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { BinanceService } from '../binance/binance.service';
import { Model } from 'mongoose';
import { from, Observable, of, throwError } from 'rxjs';
import { map, find, filter, mergeMap, flatMap, catchError } from 'rxjs/operators';
import { InjectModel } from '@nestjs/mongoose';
import { ExchangeInfo } from './schemas/ExchangeInfo.schema';

import * as request from 'request';
import { ExchangeConstants } from './constants/ExchangeConstants';
import { PrivateRequestsKeysWithExchange, BaseBinanceModel } from 'src/models/PrivateRequestsModel';
import { Account } from 'binance-api-node';
import { GeneralConfig } from 'src/condition/schemas/Conditions.schema';

@Injectable()
export class ExchangeCoordinatorService {
  constructor(
    @InjectModel('ExchangeInfo')
    private ExchangeInfoModel: Model<ExchangeInfo>,
    private binance: BinanceService,
    private readonly httpService: HttpService,
  ) {}

  public returnFile(fileName: string, extension: string, rootPath: string, res: any) {
    return res.sendFile(
      fileName.toLowerCase() + extension,
      {
        root: rootPath,
      },
      error => {
        if (error) {
          res.status(404).send(new HttpException('The ' + fileName + extension + ' was not found', 404));
        }
      },
    );
  }

  public getImageByName(name: string, res: any, photoSizePx: number): Observable<any> {
    if (ExchangeConstants.isValidImageSize(photoSizePx)) {
      return this.fetchCMCFullData()
        .pipe(
          map(entry => {
            return Object.keys(entry)
              .map(entradaKey => {
                return entry[entradaKey];
              })
              .find(
                valorMapeado =>
                  valorMapeado.slug.toLowerCase() == name.toLowerCase() || valorMapeado.symbol.toLowerCase() == name.toLowerCase(),
              );
          }),
        )
        .pipe(
          mergeMap(resultado =>
            this.httpService
              .get('https://s2.coinmarketcap.com/static/img/coins/' + photoSizePx + 'x' + photoSizePx + '/' + resultado.id + '.png', {
                responseType: 'arraybuffer',
              })
              .pipe(
                map(response =>
                  res.send({
                    imagen: Buffer.from(response.data, 'binary').toString('base64'),
                    extension: 'base64',
                  }),
                ),
              ),
          ),
          catchError(error => of(res.status(404).send({ message: '' + error }))),
        );
    } else {
      of(
        res.status(404).send({
          message: '' + ExchangeConstants.NON_VALID_IMAGE_SIZE_ERROR_MESSAGE,
        }),
      );
    }
  }

  public fetchCMCFullData(): Observable<any> {
    return this.httpService
      .get('https://s2.coinmarketcap.com/generated/search/quick_search.json')
      .pipe(map(response => response.data))
      .pipe(
        map(entry => {
          return Object.keys(entry).map(entradaKey => {
            return entry[entradaKey];
          });
        }),
      );
  }

  public fetchAllExchanges() {
    return this.ExchangeInfoModel.find();
  }

  async inserSomething(exchange: ExchangeInfo): Promise<ExchangeInfo> {
    const createdExchange = new this.ExchangeInfoModel({
      name: exchange.name,
      imageName: exchange.imageName,
      idExchange: exchange.idExchange,
    });
    return await createdExchange.save();
  }

  async returnAccountInfoFromSpecificExchange(data: PrivateRequestsKeysWithExchange): Promise<Account> {
    switch (data.exchange.toLowerCase()) {
      case 'binance':
        return this.binance.getAccountInfo({ keys: { public: data.public, private: data.private } });
      default:
        throw new HttpException('The exchange ' + data.exchange + ' was not found!', 404);
    }
  }

  public executeOrderDependingOnExchange(data: BaseBinanceModel, exchange: string) {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return this.binance.newOrder(data.keys, data.params);
      default:
        throw new HttpException('The exchange ' + exchange + ' was not found!', 404);
    }
  }

  public returnTimeDependingOnExchange(exchangeName: string) {
    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return this.binance.getTime();
      default:
        throw new HttpException('The exchange ' + exchangeName + ' was not found!', 404);
    }
  }

  public returnFuturesAccountInfoFromSpecificExchange(data: PrivateRequestsKeysWithExchange) {
    switch (data.exchange.toLowerCase()) {
      case 'binance':
        return this.binance.getFutureAccountInfo({ keys: { public: data.public, private: data.private } });
      default:
        throw new HttpException('The exchange ' + data.exchange + ' was not found!', 404);
    }
  }

  async returnPriceOfAssetDependingOnExchange(exchange: string, fullAssetPair: string) {
    switch (exchange) {
      case 'binance':
        return this.binance.returnFuturePrice(fullAssetPair);
      default:
        throw new HttpException('The exchange ' + exchange + ' was not found!', 404);
    }
  }

  //Public
  async returnExchangeInfoFromSpecificExchange(exchange: string) {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return this.binance.getExchangeInfo();
      default:
        throw new HttpException('The exchange ' + exchange + ' was not found!', 404);
    }
  }

  async returnFuturesExchangeInfoFromSpecificExchange(exchange: string) {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return this.binance.getFuturesExchangeInfo();
      default:
        throw new HttpException('The exchange ' + exchange + ' was not found!', 404);
    }
  }

  async returnAssetsFromSpecificExchange(exchangeName: string) {
    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return this.binance.returnAllAssets();
      default:
        throw new HttpException('The exchange ' + exchangeName + ' was not found!', 404);
    }
  }

  async returnFutureAssetsFromSpecificExchange(exchangeName: string) {
    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return this.binance.returnAllFutureAssets();
      default:
        throw new HttpException('The exchange ' + exchangeName + ' was not found!', 404);
    }
  }

  async devolverHistoricoDependendiendoDelEXCHANGE(generalConfig:GeneralConfig) {
    switch (generalConfig.exchange.toLowerCase()) {
      case 'binance':
        return await this.binance.returnHistoric(
          generalConfig.historicParams.symbol,
          generalConfig.historicParams.interval,
          generalConfig.historicParams.limit,
        );
      default:
        throw new HttpException('The exchange ' + generalConfig.exchange + ' was not found!', 404);
    }
  }
}
