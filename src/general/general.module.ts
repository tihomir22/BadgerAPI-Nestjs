import { Module } from '@nestjs/common';
import { GeneralController } from './general.controller';
import { GeneralService } from './general.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PushNotificationSchema } from './schemas/PushNotification.schema';

@Module({
  controllers: [GeneralController],
  providers: [GeneralService],
  imports: [
    MongooseModule.forFeature([
      {
        name: 'PushNotification',
        schema: PushNotificationSchema,
        collection: 'PushNotifications',
      },
    ]),
  ],
  exports: [GeneralService],
})
export class GeneralModule {}
