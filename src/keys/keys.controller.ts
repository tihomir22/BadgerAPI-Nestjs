import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { UserKey, JustKeys } from './schemas/UserKeys.schema';
import { KeysService } from './keys.service';

@Controller('keys')
export class KeysController {
  constructor(private keyService: KeysService) {}

  @Post('addNew')
  addNewKey(@Body() newKey: UserKey) {
    return this.keyService.addNewKey(newKey);
  }
  @Post('updateKey')
  updateKey(@Body() oldKey: UserKey) {
    return this.keyService.updateKey(oldKey);
  }

  @Delete('deleteById/:id')
  deleteById(@Param('id') id: any) {
    return this.keyService.deleteById(id);
  }

  @Get('getUserKeys/:user')
  getKeys(@Param('user') user: string) {
    return this.keyService.returnKeysByUserID(user);
  }

  @Get('lookForValidKey/:user') lookForValidKey(@Param('user') user: string) {
    return this.keyService.lookForValidKey(user);
  }

  @Post('decryptKeys') decryptKeys(@Body() keys: JustKeys) {
    return this.keyService.returnDecrypted(keys);
  }
}
