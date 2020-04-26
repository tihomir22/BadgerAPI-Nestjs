import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AsciiStuff } from './static/ascii';
import * as morgan from 'morgan';
import * as dotenv from 'dotenv';
import * as webpush from 'web-push';
dotenv.config();

async function bootstrap() {
  console.log(AsciiStuff.art);
  //webPushConfig();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.useStaticAssets(join(__dirname, '..', 'assets'));
  app.enableCors();
  app.use(morgan('dev'));
  await app.listen(process.env.PORT || 3000);
}

function webPushConfig() {
  console.log(process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
  webpush.setVapidDetails('mailto:tihomir_alcudia3@hotmail.com', process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
}

bootstrap();
