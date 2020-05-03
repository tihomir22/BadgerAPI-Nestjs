import { Controller, Post, Body, Get } from '@nestjs/common';
import { PushNotification, PushNotificationWrapper } from './schemas/PushNotification.schema';
import { GeneralService } from './general.service';

@Controller('general')
export class GeneralController {
  constructor(private generalService: GeneralService) {}

  @Post('activateSuscription') activateSuscription(@Body() body: PushNotificationWrapper) {
    return this.generalService.saveNewSuscription(body);
  }

  @Get('suscriptions') getAllSuscriptions() {
    return this.generalService.getAllSuscriptions();
  }
}
