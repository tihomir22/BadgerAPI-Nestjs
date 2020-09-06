import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserKeysSchema } from './schemas/UserKeys.schema';
import { KeysService } from './keys.service';
import { BinanceModule } from '../binance/binance.module';
import { CryptoService } from '../crypto/crypto/crypto.service';
import { Connection } from 'mongoose';

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
  providers: [KeysService, CryptoService, Connection],
  exports: [KeysService],
})
export class KeysModule {}
