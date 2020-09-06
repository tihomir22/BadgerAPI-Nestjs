import { Injectable } from '@nestjs/common';
import { UserKey, JustKeys } from './schemas/UserKeys.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { from, forkJoin, Observable, empty, of } from 'rxjs';
import { BinanceService } from '../binance/binance.service';
import { BadgerUtils } from '../static/Utils';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { assert } from 'console';

@Injectable()
export class KeysService {
  constructor(
    @InjectModel('UserKey') private userKeyModel: Model<UserKey>,
    private binance: BinanceService,
    private crypto: CryptoService,
  ) {}

  async addNewKey(key: UserKey) {
    const createKey = new this.userKeyModel({
      user: key.user,
      name: key.name,
      exchangeID: key.exchangeID,
      publicK: key.publicK,
      privateK: key.privateK,
      isTestnet: key.isTestnet,
      defaultKey: key.defaultKey,
    });
    return await createKey.save();
  }

  async updateKey(key: UserKey) {
    if (key.defaultKey) {
      await this.userKeyModel.updateMany({ defaultKey: true }, { defaultKey: false });
    }
    let modeloActualizado = await this.userKeyModel.findByIdAndUpdate(key._id, key);
    return modeloActualizado;
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

  public returnDecrypted(justKeyS: JustKeys) {
    justKeyS.privateK = this.crypto.decryptTXT(justKeyS.privateK);
    justKeyS.publicK = this.crypto.decryptTXT(justKeyS.publicK);
    return justKeyS;
  }
}
