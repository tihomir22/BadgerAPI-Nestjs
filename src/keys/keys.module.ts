import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserKeysSchema } from './schemas/UserKeys.schema';
import { KeysService } from './keys.service';
import { BinanceModule } from '../binance/binance.module';

@Module({
  controllers: [KeysController],
  imports: [
    BinanceModule,
    MongooseModule.forFeature([
      {
        name: 'UserKey',
        schema: UserKeysSchema,
        collection: 'UserKeys',
      },
    ]),
  ],
  providers: [KeysService],
  exports: [KeysService],
})
export class KeysModule {}
