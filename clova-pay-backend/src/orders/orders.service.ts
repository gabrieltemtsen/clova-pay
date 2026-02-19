import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto, OrderStatus } from './dto/order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    try {
      const order = await this.prisma.order.create({
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

      this.logger.log(`Created order: ${order.id} (Stacks ID: ${dto.stacksOrderId})`);
      return order;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`Order with Stacks ID ${dto.stacksOrderId} already exists`);
        }
      }
      this.logger.error(`Failed to create order: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  async findAll(query: OrderQueryDto) {
    try {
      const { sender, status, limit = 50, offset = 0 } = query;

      return await this.prisma.order.findMany({
        where: {
          ...(sender && { sender }),
          ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      this.logger.error(`Failed to fetch orders: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch orders');
    }
  }

  async findOne(id: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id },
      });

      if (!order) {
        throw new NotFoundException(`Order ${id} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to find order ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  async findByStacksId(stacksOrderId: number) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { stacksOrderId },
      });

      if (!order) {
        throw new NotFoundException(`Order with Stacks ID ${stacksOrderId} not found`);
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to find order by Stacks ID ${stacksOrderId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch order');
    }
  }

  async updateStatus(id: string, dto: UpdateOrderDto) {
    try {
      const order = await this.findOne(id); // Checks existence

      const updated = await this.prisma.order.update({
        where: { id },
        data: {
          status: dto.status,
          // Keep DB compatibility: map neutral API fields onto existing columns.
          paycrestOrderId: dto.offrampOrderId ?? order.paycrestOrderId,
          paycrestStatus: dto.offrampStatus ?? order.paycrestStatus,
          ...(dto.status === OrderStatus.CONFIRMED && { confirmedAt: new Date() }),
        },
      });

      this.logger.log(`Updated order ${id} status to ${dto.status}`);
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to update order ${id}: ${error.message}`);
      throw new InternalServerErrorException('Failed to update order');
    }
  }

  async markProcessing(id: string, offrampOrderId: string) {
    return this.updateStatus(id, {
      status: OrderStatus.PROCESSING,
      offrampOrderId,
    });
  }

  async markSettled(id: string) {
    return this.updateStatus(id, {
      status: OrderStatus.SETTLED,
      offrampStatus: 'SETTLED',
    });
  }

  async markConfirmed(id: string) {
    return this.updateStatus(id, {
      status: OrderStatus.CONFIRMED,
    });
  }

  async markFailed(id: string, reason?: string) {
    try {
      // Note: Directly calling update here to bypass status check if needed,
      // but normally updateStatus is safer. For failure, we might want to force it.
      const updated = await this.prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.FAILED,
          paycrestStatus: reason ?? 'FAILED', // DB column name retained for backward compatibility
        },
      });
      this.logger.warn(`Marked order ${id} as FAILED: ${reason}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to mark order ${id} as failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to update order status');
    }
  }

  async getStats() {
    try {
      const [total, pending, processing, confirmed, failed] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
        this.prisma.order.count({ where: { status: OrderStatus.PROCESSING } }),
        this.prisma.order.count({ where: { status: OrderStatus.CONFIRMED } }),
        this.prisma.order.count({ where: { status: OrderStatus.FAILED } }),
      ]);

      return { total, pending, processing, confirmed, failed };
    } catch (error) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      throw new InternalServerErrorException('Failed to get statistics');
    }
  }
}
