import { Injectable, HttpException } from '@nestjs/common';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';
import { BinanceService } from '../binance/binance.service';
import { Model } from 'mongoose';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { InjectModel } from '@nestjs/mongoose';
import { ExchangeInfo } from './schemas/ExchangeInfo.schema';

@Injectable()
export class ExchangeCoordinatorService {
  constructor(
    @InjectModel('ExchangeInfo')
    private readonly ExchangeInfoModel: Model<ExchangeInfo>,
    private binance: BinanceService,
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

  public fetchAllExchanges(res: any): Observable<any> {
    // return await this.ExchangeInfoModel.find().exec();
    return from(this.ExchangeInfoModel.find().exec()).pipe(
      map(
        exchangeInfo =>
          (exchangeInfo['img'] = this.returnFile(
            'binance',
            '.png',
            'src/assets',
            res,
          )),
      ),
    );
  }

  async inserSomething(): Promise<ExchangeInfo> {
    const createdExchange = new this.ExchangeInfoModel({
      name: 'yea boi',
      imageName: 'holy shiet',
    });
    return await createdExchange.save();
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
