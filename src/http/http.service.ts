import { Injectable, HttpService } from '@nestjs/common';

@Injectable()
export class HttpServiceCustom {
  constructor(public http: HttpService) {}
}
