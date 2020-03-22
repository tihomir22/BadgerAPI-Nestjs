import { Controller, Post, Body } from '@nestjs/common';
import { UserKey } from './schemas/UserKeys.schema';
import { KeysService } from './keys.service';

@Controller('keys')
export class KeysController {
  constructor(private keyService: KeysService) {}

  @Post('addNew')
  addNewKey(@Body() newKey: UserKey) {
      return this.keyService.addNewKey(newKey)
  }
}
