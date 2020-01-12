import { Injectable, HttpException, HttpService } from '@nestjs/common';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { BinanceService } from '../binance/binance.service';
import { Model } from 'mongoose';
import { from, Observable, of, throwError } from 'rxjs';
import {
  map,
  find,
  filter,
  mergeMap,
  flatMap,
  catchError,
} from 'rxjs/operators';
import { InjectModel } from '@nestjs/mongoose';
import { ExchangeInfo } from './schemas/ExchangeInfo.schema';

import * as request from 'request';

@Injectable()
export class ExchangeCoordinatorService {
  constructor(
    @InjectModel('ExchangeInfo')
    private readonly ExchangeInfoModel: Model<ExchangeInfo>,
    private binance: BinanceService,
    private readonly httpService: HttpService,
  ) {}

  public returnFile(
    fileName: string,
    extension: string,
    rootPath: string,
    res: any,
  ) {
    return res.sendFile(
      fileName.toLowerCase() + extension,
      {
        root: rootPath,
      },
      error => {
        if (error) {
          res
            .status(404)
            .send(
              new HttpException(
                'The ' + fileName + extension + ' was not found',
                404,
              ),
            );
        }
      },
    );
  }

  public getImageByName(name: string, res: any): Observable<any> {
    return this.fetchCMCFullData()
      .pipe(
        map(entry => {
          return Object.keys(entry)
            .map(entradaKey => {
              return entry[entradaKey];
            })
            .find(valorMapeado => valorMapeado.slug == name);
        }),
      )
      .pipe(
        mergeMap(resultado =>
          this.httpService
            .get(
              'https://s2.coinmarketcap.com/static/img/coins/32x32/' +
                resultado.id +
                '.png',
              { responseType: 'arraybuffer' },
            )
            .pipe(
              map(response =>
                res.send({
                  imagen: Buffer.from(response.data, 'binary').toString(
                    'base64',
                  ),
                  extension: 'base64',
                }),
              ),
            ),
        ),
        catchError(error => of(res.status(404).send({ message: '' + error }))),
      );
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

  public fetchAllExchanges(): Observable<any> {
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

  async returnAssetsFromSpecificExchange(exchangeName: string) {
    switch (exchangeName.toLowerCase()) {
      case 'binance':
        return this.binance.returnAllAssets();
      default:
        throw new HttpException(
          'The exchange ' + exchangeName + ' was not found!',
          404,
        );
    }
  }

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
