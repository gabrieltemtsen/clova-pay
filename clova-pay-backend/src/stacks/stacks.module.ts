import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StacksService } from './stacks.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [HttpModule, OrdersModule],
  providers: [StacksService],
  exports: [StacksService],
})
export class StacksModule {}
