import { Injectable } from '@nestjs/common';
import { UserKey } from './schemas/UserKeys.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class KeysService {
  constructor(@InjectModel('UserKey') private userKeyModel: Model<UserKey>) {}

  async addNewKey(key: UserKey) {
    const createKey = new this.userKeyModel({
      user: key.user,
      exchangeID: key.exchangeID,
      publicK: key.publicK,
      privateK: key.privateK,
    });
    return await createKey.save();
  }
}
