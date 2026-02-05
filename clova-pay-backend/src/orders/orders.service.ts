import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateOrderDto,
    UpdateOrderDto,
    OrderQueryDto,
    OrderStatus,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateOrderDto) {
        return this.prisma.order.create({
            data: {
                stacksOrderId: dto.stacksOrderId,
                txId: dto.txId,
                sender: dto.sender,
                amount: BigInt(dto.amount),
                fee: BigInt(dto.fee),
                fiatAmount: BigInt(dto.fiatAmount),
                fiatCurrency: dto.fiatCurrency,
                bankDetailsHash: dto.bankDetailsHash,
                tokenContract: dto.tokenContract,
                status: OrderStatus.PENDING,
            },
        });
    }

    async findAll(query: OrderQueryDto) {
        const { sender, status, limit = 50, offset = 0 } = query;

        return this.prisma.order.findMany({
            where: {
                ...(sender && { sender }),
                ...(status && { status }),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    }

    async findOne(id: string) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            throw new NotFoundException(`Order ${id} not found`);
        }

        return order;
    }

    async findByStacksId(stacksOrderId: number) {
        const order = await this.prisma.order.findUnique({
            where: { stacksOrderId },
        });

        if (!order) {
            throw new NotFoundException(`Order with Stacks ID ${stacksOrderId} not found`);
        }

        return order;
    }

    async updateStatus(id: string, dto: UpdateOrderDto) {
        const order = await this.findOne(id);

        return this.prisma.order.update({
            where: { id },
            data: {
                status: dto.status,
                paycrestOrderId: dto.paycrestOrderId ?? order.paycrestOrderId,
                paycrestStatus: dto.paycrestStatus ?? order.paycrestStatus,
                ...(dto.status === OrderStatus.CONFIRMED && { confirmedAt: new Date() }),
            },
        });
    }

    async markProcessing(id: string, paycrestOrderId: string) {
        return this.updateStatus(id, {
            status: OrderStatus.PROCESSING,
            paycrestOrderId,
        });
    }

    async markSettled(id: string) {
        return this.updateStatus(id, {
            status: OrderStatus.SETTLED,
            paycrestStatus: 'SETTLED',
        });
    }

    async markConfirmed(id: string) {
        return this.updateStatus(id, {
            status: OrderStatus.CONFIRMED,
        });
    }

    async markFailed(id: string, reason?: string) {
        return this.prisma.order.update({
            where: { id },
            data: {
                status: OrderStatus.FAILED,
                paycrestStatus: reason ?? 'FAILED',
            },
        });
    }

    async getStats() {
        const [total, pending, processing, confirmed, failed] = await Promise.all([
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
            this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
            this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
            this.prisma.order.count({ where: { status: OrderStatus.FAILED } }),
        ]);

        return { total, pending, processing, confirmed, failed };
    }
}
