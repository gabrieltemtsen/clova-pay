import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderQueryDto, UpdateOrderDto, CreateOrderDto } from './dto/order.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Get()
    @ApiOperation({ summary: 'List all orders' })
    @ApiResponse({ status: 200, description: 'Return a list of orders.' })
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
    @ApiOperation({ summary: 'Get order statistics' })
    @ApiResponse({ status: 200, description: 'Return order statistics.' })
    async getStats() {
        return this.ordersService.getStats();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific order by ID' })
    @ApiResponse({ status: 200, description: 'Return the order.' })
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
    @ApiOperation({ summary: 'Get a specific order by Stacks Order ID' })
    @ApiResponse({ status: 200, description: 'Return the order.' })
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
    @ApiOperation({ summary: 'Update order status' })
    @ApiResponse({ status: 200, description: 'Return the updated order.' })
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
    @UseGuards(ApiKeyGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Trigger Clova Africa off-ramp settlement process (Admin only)' })
    @ApiResponse({ status: 200, description: 'Order queued for off-ramp settlement.' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async processOrder(@Param('id') id: string) {
        // This will be called to trigger Clova Africa settlement orchestration.
        // For now, mark as processing with provider-neutral reference.
        const order = await this.ordersService.markProcessing(id, 'pending-clova-africa');
        return {
            ...order,
            amount: order.amount.toString(),
            fee: order.fee.toString(),
            fiatAmount: order.fiatAmount.toString(),
            message: 'Order queued for Clova Africa settlement',
        };
    }
}
