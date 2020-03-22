import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { UserKeysSchema } from './schemas/UserKeys.schema';
import { KeysService } from './keys.service';

@Module({
  controllers: [KeysController],
  imports: [
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
