import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OrdersModule } from './orders/orders.module';
import { StacksModule } from './stacks/stacks.module';
import { PaycrestModule } from './paycrest/paycrest.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    OrdersModule,
    StacksModule,
    PaycrestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
