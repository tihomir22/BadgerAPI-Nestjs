import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { ConditionPack } from '../condition/schemas/Conditions.schema';

@Injectable()
export class RedireccionadorMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => any) {
    if (this.comprobarExistenciaParametrosBasicos(req.body)) {
      next();
    } else {
      throw new HttpException('You passed an incorrect body!', 400);
    }
  }

  private comprobarExistenciaParametrosBasicos(body: ConditionPack) {
    return body.conditionConfig && body.generalConfig && body.user;
  }
}
