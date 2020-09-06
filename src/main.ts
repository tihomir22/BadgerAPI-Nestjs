import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AsciiStuff } from './static/ascii';
import * as morgan from 'morgan';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  console.log(AsciiStuff.art);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.useStaticAssets(join(__dirname, '..', 'assets'));
  app.enableCors();
  app.use(morgan('dev'));
  await app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log(`listening on
   ${process.env.PORT || 3000} `);
  });
}

bootstrap();
