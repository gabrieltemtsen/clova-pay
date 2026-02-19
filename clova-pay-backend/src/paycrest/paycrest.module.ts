import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaycrestService } from './paycrest.service';

@Module({
  imports: [HttpModule],
  providers: [PaycrestService],
  exports: [PaycrestService],
})
export class PaycrestModule {}
