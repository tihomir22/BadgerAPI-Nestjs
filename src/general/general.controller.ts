import { Controller, Post, Body } from '@nestjs/common';

@Controller('general')
export class GeneralController {
  @Post('activateSuscription') activateSuscription(@Body() body) {
    console.log(body);
  }
}
