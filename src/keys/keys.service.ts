import { Injectable } from '@nestjs/common';
import { UserKey } from './schemas/UserKeys.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BadgerUtils } from 'src/static/Utils';
import { from, forkJoin, Observable, empty, of } from 'rxjs';
import { BinanceService } from 'src/binance/binance.service';
import { catchError } from 'rxjs/operators';

@Injectable()
export class KeysService {
  constructor(@InjectModel('UserKey') private userKeyModel: Model<UserKey>, private binance: BinanceService) {}

  async addNewKey(key: UserKey) {
    const createKey = new this.userKeyModel({
      user: key.user,
      name: key.name,
      exchangeID: key.exchangeID,
      publicK: key.publicK,
      privateK: key.privateK,
    });
    return await createKey.save();
  }

  async updateKey(key: UserKey) {
    return await this.userKeyModel.findByIdAndUpdate(key._id, key);
  }

  async returnKeysByUserID(userId: any) {
    return await this.userKeyModel.find({ user: userId });
  }

  async deleteById(idEnty: any) {
    return await this.userKeyModel.findOneAndDelete({ _id: idEnty });
  }

  async lookForValidKey(user: string) {
    let userKeys: Array<UserKey> = await this.userKeyModel.find({ user: user });
    let observableKeys = userKeys.filter(entry => BadgerUtils.isValidUserKey(entry));
    return observableKeys;
  }
}
