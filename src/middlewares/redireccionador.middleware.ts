import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { PaqueteIndicadorTecnico } from '../models/PaqueteIndicadorTecnico';

@Injectable()
export class RedireccionadorMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => any) {
    if (this.comprobarExistenciaParametrosBasicos(req.body)) {
      next();
    } else {
      throw new HttpException('You passed an incorrect body!', 500);
    }
  }

  private comprobarExistenciaParametrosBasicos(body: PaqueteIndicadorTecnico) {
    return body.exchange && body.historicParams && body.indicatorParams;
  }
}
