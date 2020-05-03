import { Injectable } from '@nestjs/common';
import { PushNotification, PushNotificationWrapper } from './schemas/PushNotification.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class GeneralService {
  private config;

  constructor(@InjectModel('PushNotification') private pushNotification: Model<PushNotification>) {}

  public setWebpushConfig(config) {
    this.config = config;
  }

  public getWebpushConfig() {
    return this.config;
  }

  public async sendNotificationToSpecificUser(userName: string, messageData: any) {
    let allSubs = await this.getUserSuscriptions(userName);
    return forkJoin(allSubs.map(entry => this.getWebpushConfig().sendNotification(entry, JSON.stringify(messageData)))).pipe(
      catchError(err => of('sendNotificationToSpecificUser L24 ' + err.body)),
    );
  }

  public async saveNewSuscription(suscription: PushNotificationWrapper) {
    const createSuscription = new this.pushNotification({
      user: suscription.user,
      endpoint: suscription.body.endpoint,
      expirationTime: suscription.body.expirationTime,
      keys: suscription.body.keys,
    });
    return await createSuscription.save();
  }

  public async getAllSuscriptions() {
    return await this.pushNotification.find();
  }

  public async getUserSuscriptions(user: string) {
    return await this.pushNotification.find({ user: user });
  }

  public async deleteByEndpoint(endpoint: string) {
    return await this.pushNotification.deleteOne({ endpoint: endpoint });
  }

  public generateNotification(titulo: string, cuerpo: string, icono?: string) {
    return {
      notification: {
        title: titulo,
        body: cuerpo,
        icon: icono ? icono : 'assets/logo64.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1,
        },
        actions: [
          {
            action: 'explore',
            title: 'Ver',
          },
        ],
      },
    };
  }
}
