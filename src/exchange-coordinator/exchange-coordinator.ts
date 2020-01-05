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
