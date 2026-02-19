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
import { OrderQueryDto, UpdateOrderDto, ProcessOrderDto } from './dto/order.dto';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ClovaAfricaService } from '../clova-africa/clova-africa.service';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService,
        private readonly clovaAfricaService: ClovaAfricaService,
    ) { }

    private serializeOrder(order: any) {
        return {
            ...order,
            amount: order.amount?.toString?.() ?? order.amount,
            fee: order.fee?.toString?.() ?? order.fee,
            fiatAmount: order.fiatAmount?.toString?.() ?? order.fiatAmount,
            offrampOrderId: order.paycrestOrderId || null,
            offrampStatus: order.paycrestStatus || null,
        };
    }

    @Get()
    @ApiOperation({ summary: 'List all orders' })
    @ApiResponse({ status: 200, description: 'Return a list of orders.' })
    async findAll(@Query() query: OrderQueryDto) {
        const orders = await this.ordersService.findAll(query);
        // Convert BigInt to string for JSON serialization
        return orders.map((order) => this.serializeOrder(order));
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
        return this.serializeOrder(order);
    }

    @Get('stacks/:stacksOrderId')
    @ApiOperation({ summary: 'Get a specific order by Stacks Order ID' })
    @ApiResponse({ status: 200, description: 'Return the order.' })
    async findByStacksId(@Param('stacksOrderId') stacksOrderId: string) {
        const order = await this.ordersService.findByStacksId(parseInt(stacksOrderId, 10));
        return this.serializeOrder(order);
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
        return this.serializeOrder(order);
    }

    @Post(':id/process')
    @UseGuards(ApiKeyGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Trigger Clova Africa off-ramp settlement process (Admin only)' })
    @ApiResponse({ status: 200, description: 'Order sent to Clova Africa settlement.' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async processOrder(@Param('id') id: string, @Body() dto: ProcessOrderDto) {
        const providerOrder = await this.clovaAfricaService.createOrder({
            asset: dto.asset,
            amountCrypto: dto.amountCrypto,
            recipient: {
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
                bankCode: dto.bankCode,
            },
        });

        const order = await this.ordersService.markProcessing(id, providerOrder.orderId);
        return {
            ...this.serializeOrder(order),
            message: 'Order sent to Clova Africa settlement',
            provider: providerOrder,
        };
    }

    @Get(':id/offramp-status')
    @UseGuards(ApiKeyGuard)
    @ApiOperation({ summary: 'Fetch and sync current Clova Africa order status for a local order' })
    @ApiResponse({ status: 200, description: 'Returns provider status and synced local order status.' })
    async getOfframpStatus(@Param('id') id: string) {
        const order = await this.ordersService.findOne(id);
        if (!order.paycrestOrderId) {
            return {
                order: this.serializeOrder(order),
                provider: null,
                message: 'No linked off-ramp provider order yet.',
            };
        }

        const provider = await this.clovaAfricaService.getOrder(order.paycrestOrderId);

        if (provider.status === 'settled' || provider.status === 'paid_out') {
            await this.ordersService.markSettled(order.id);
        } else if (provider.status === 'failed') {
            await this.ordersService.markFailed(order.id, provider.status);
        }

        const fresh = await this.ordersService.findOne(id);
        return {
            order: this.serializeOrder(fresh),
            provider,
        };
    }
}
