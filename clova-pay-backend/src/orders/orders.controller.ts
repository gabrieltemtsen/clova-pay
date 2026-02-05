import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderQueryDto, UpdateOrderDto } from './dto/order.dto';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    async findAll(@Query() query: OrderQueryDto) {
        const orders = await this.ordersService.findAll(query);
        // Convert BigInt to string for JSON serialization
        return orders.map((order) => ({
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
        }));
    }

    @Get('stats')
    async getStats() {
        return this.ordersService.getStats();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const order = await this.ordersService.findOne(id);
        return {
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
        };
    }

    @Get('stacks/:stacksOrderId')
    async findByStacksId(@Param('stacksOrderId') stacksOrderId: string) {
        const order = await this.ordersService.findByStacksId(parseInt(stacksOrderId, 10));
        return {
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
        };
    }

    @Post(':id/status')
    @HttpCode(HttpStatus.OK)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateOrderDto,
    ) {
        const order = await this.ordersService.updateStatus(id, dto);
        return {
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
        };
    }

    @Post(':id/process')
    @HttpCode(HttpStatus.OK)
    async processOrder(@Param('id') id: string) {
        // This will be called to trigger Paycrest settlement
        // For now, just mark as processing
        const order = await this.ordersService.markProcessing(id, 'pending-paycrest');
        return {
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
            message: 'Order queued for Paycrest settlement',
        };
    }
}
