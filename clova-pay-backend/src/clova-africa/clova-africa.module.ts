import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClovaAfricaService } from './clova-africa.service';

@Module({
  imports: [HttpModule],
  providers: [ClovaAfricaService],
  exports: [ClovaAfricaService],
})
export class ClovaAfricaModule {}
