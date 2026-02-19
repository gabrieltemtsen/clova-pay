import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/dto/order.dto';
import {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
  OrderRefundedEvent,
} from './interfaces/stacks-events.interface';

@Injectable()
export class StacksService implements OnModuleInit {
  private readonly logger = new Logger(StacksService.name);
  private readonly apiUrl: string;
  private readonly contractAddress: string;
  private readonly contractName: string;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly ordersService: OrdersService,
  ) {
    this.apiUrl = this.configService.get<string>('STACKS_API_URL', 'https://api.testnet.hiro.so');
    this.contractAddress = this.configService.get<string>('CONTRACT_ADDRESS', '');
    this.contractName = this.configService.get<string>('CONTRACT_NAME', 'off-ramp');

    this.validateConfig();
  }

  private validateConfig() {
    if (!this.apiUrl) throw new Error('STACKS_API_URL is not defined');
    if (!this.contractAddress) throw new Error('CONTRACT_ADDRESS is not defined');
  }

  async onModuleInit() {
    if (this.configService.get('NODE_ENV') !== 'test') {
      this.startPolling();
    }
  }

  startPolling(intervalMs: number = 30000) {
    this.logger.log(
      `Starting Stacks event polling for ${this.contractAddress}.${this.contractName}...`,
    );

    this.pollingInterval = setInterval(async () => {
      await this.pollEventsWithRetry();
    }, intervalMs);

    // Poll immediately on start
    this.pollEventsWithRetry().catch((err) =>
      this.logger.error(`Initial poll error: ${err.message}`),
    );
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async pollEventsWithRetry(retryCount = 0) {
    try {
      await this.pollEvents();
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        this.logger.warn(`Polling failed, retrying (${retryCount + 1}/${this.MAX_RETRIES})...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        await this.pollEventsWithRetry(retryCount + 1);
      } else {
        this.logger.error(
          `Failed to poll events after ${this.MAX_RETRIES} retries: ${error.message}`,
        );
      }
    }
  }

  async pollEvents() {
    const contractId = `${this.contractAddress}.${this.contractName}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.apiUrl}/extended/v1/contract/${contractId}/events`,
          { params: { limit: 50 }, timeout: 5000 }, // Add timeout
        ),
      );

      const events = response.data.results || [];

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      throw error; // Let retry logic handle it
    }
  }

  private async processEvent(event: any) {
    if (!event.contract_log) return;

    const logValue = event.contract_log.value?.repr;
    if (!logValue) return;

    try {
      const parsed = this.parseClarityPrint(logValue);
      if (!parsed) return;

      const eventType = parsed.event;
      // Only log if it's one of our events
      if (
        ['order-created', 'order-confirmed', 'order-cancelled', 'order-refunded'].includes(
          eventType,
        )
      ) {
        this.logger.debug(`Processing event: ${eventType}`);
      }

      switch (eventType) {
        case 'order-created':
          await this.handleOrderCreated(parsed as OrderCreatedEvent, event.tx_id);
          break;
        case 'order-confirmed':
          await this.handleOrderConfirmed(parsed as OrderConfirmedEvent);
          break;
        case 'order-cancelled':
          await this.handleOrderCancelled(parsed as OrderCancelledEvent);
          break;
        case 'order-refunded':
          await this.handleOrderRefunded(parsed as OrderRefundedEvent);
          break;
      }
    } catch (error) {
      this.logger.error(`Event processing error: ${error.message}`, error.stack);
    }
  }

  private parseClarityPrint(repr: string): any {
    try {
      const content = repr.replace(/^\(tuple\s*/, '').replace(/\)$/, '');
      const pairs = content.match(/\(([^()]+)\)/g) || [];

      const result: any = {};
      for (const pair of pairs) {
        const match = pair.match(/\((\S+)\s+(.+)\)/);
        if (match) {
          const key = match[1].replace(/-/g, '');
          let value: any = match[2];

          if (value.startsWith('u')) {
            value = parseInt(value.slice(1), 10);
          } else if (value.startsWith("'")) {
            value = value.slice(1);
          } else if (value.startsWith('"')) {
            value = value.slice(1, -1);
          }
          result[key] = value;
        }
      }
      return result;
    } catch {
      return null;
    }
  }

  private async handleOrderCreated(data: OrderCreatedEvent, txId: string) {
    try {
      const exists = await this.ordersService.findByStacksId(data.orderid).catch(() => null);

      if (exists) {
        this.logger.debug(`Order ${data.orderid} already exists, skipping`);
        return;
      }

      await this.ordersService.create({
        stacksOrderId: data.orderid,
        txId,
        sender: data.sender,
        amount: data.amount,
        fee: data.fee,
        fiatAmount: data.fiatamount,
        fiatCurrency: data.fiatcurrency,
        bankDetailsHash: data.bankdetailshash,
      });

      this.logger.log(`Created order from Stacks: ${data.orderid}`);
    } catch (error) {
      this.logger.error(`Failed to handle order-created for ${data.orderid}: ${error.message}`);
    }
  }

  private async handleOrderConfirmed(data: OrderConfirmedEvent) {
    try {
      const order = await this.ordersService.findByStacksId(data.orderid).catch(() => null);

      if (order && order.status !== OrderStatus.CONFIRMED) {
        await this.ordersService.markConfirmed(order.id);
        this.logger.log(`Confirmed order: ${data.orderid}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle order-confirmed for ${data.orderid}: ${error.message}`);
    }
  }

  private async handleOrderCancelled(data: OrderCancelledEvent) {
    try {
      const order = await this.ordersService.findByStacksId(data.orderid).catch(() => null);

      if (order && order.status !== OrderStatus.CANCELLED) {
        await this.ordersService.updateStatus(order.id, {
          status: OrderStatus.CANCELLED,
        });
        this.logger.log(`Cancelled order: ${data.orderid}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle order-cancelled for ${data.orderid}: ${error.message}`);
    }
  }

  private async handleOrderRefunded(data: OrderRefundedEvent) {
    try {
      const order = await this.ordersService.findByStacksId(data.orderid).catch(() => null);

      if (order && order.status !== OrderStatus.REFUNDED) {
        await this.ordersService.updateStatus(order.id, {
          status: OrderStatus.REFUNDED,
        });
        this.logger.log(`Refunded order: ${data.orderid}`);
      }
    } catch (error) {
      this.logger.error(`Failed to handle order-refunded for ${data.orderid}: ${error.message}`);
    }
  }

  async getOrderNonce(): Promise<number> {
    const contractId = `${this.contractAddress}.${this.contractName}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/v2/contracts/call-read/${contractId}/get-order-nonce`,
          {
            sender: this.contractAddress,
            arguments: [],
          },
          { timeout: 5000 },
        ),
      );

      const result = response.data.result;
      if (result && result.startsWith('(ok u')) {
        return parseInt(result.match(/u(\d+)/)?.[1] || '0', 10);
      }
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get order nonce: ${error.message}`);
      return 0;
    }
  }
}
