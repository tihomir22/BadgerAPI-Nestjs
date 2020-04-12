import { Module, HttpModule } from '@nestjs/common';
import { HttpServiceCustom } from './http.service';
@Module({
  imports: [HttpModule],
  providers: [HttpServiceCustom],
  exports: [HttpModule, HttpServiceCustom],
})
export class HttpModuleCustom {}
