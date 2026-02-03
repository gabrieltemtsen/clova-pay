import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/dto/order.dto';

@Injectable()
export class StacksService implements OnModuleInit {
    private readonly logger = new Logger(StacksService.name);
    private readonly apiUrl: string;
    private readonly contractAddress: string;
    private readonly contractName: string;
    private lastProcessedBlock: number = 0;
    private pollingInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly ordersService: OrdersService,
    ) {
        this.apiUrl = this.configService.get<string>('STACKS_API_URL', 'https://api.testnet.hiro.so');
        this.contractAddress = this.configService.get<string>('CONTRACT_ADDRESS', '');
        this.contractName = this.configService.get<string>('CONTRACT_NAME', 'off-ramp');
    }

    async onModuleInit() {
        // Start polling for events in non-test environments
        if (this.configService.get('NODE_ENV') !== 'test') {
            this.startPolling();
        }
    }

    /**
     * Start polling for contract events
     */
    startPolling(intervalMs: number = 30000) {
        this.logger.log('Starting Stacks event polling...');

        this.pollingInterval = setInterval(async () => {
            try {
                await this.pollEvents();
            } catch (error) {
                this.logger.error(`Polling error: ${error.message}`);
            }
        }, intervalMs);

        // Poll immediately on start
        this.pollEvents().catch((err) =>
            this.logger.error(`Initial poll error: ${err.message}`)
        );
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Poll for new contract events
     */
    async pollEvents() {
        const contractId = `${this.contractAddress}.${this.contractName}`;

        try {
            // Get contract events from Stacks API
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.apiUrl}/extended/v1/contract/${contractId}/events`,
                    { params: { limit: 50 } }
                ),
            );

            const events = response.data.results || [];

            for (const event of events) {
                await this.processEvent(event);
            }
        } catch (error) {
            this.logger.error(`Failed to poll events: ${error.message}`);
        }
    }

    /**
     * Process a single contract event
     */
    private async processEvent(event: any) {
        if (!event.contract_log) return;

        const logValue = event.contract_log.value?.repr;
        if (!logValue) return;

        try {
            // Parse the Clarity print output
            const parsed = this.parseClarityPrint(logValue);
            if (!parsed) return;

            const eventType = parsed.event;
            this.logger.log(`Processing event: ${eventType}`);

            switch (eventType) {
                case 'order-created':
                    await this.handleOrderCreated(parsed, event.tx_id);
                    break;
                case 'order-confirmed':
                    await this.handleOrderConfirmed(parsed);
                    break;
                case 'order-cancelled':
                    await this.handleOrderCancelled(parsed);
                    break;
                case 'order-refunded':
                    await this.handleOrderRefunded(parsed);
                    break;
            }
        } catch (error) {
            this.logger.error(`Event processing error: ${error.message}`);
        }
    }

    /**
     * Parse Clarity print output to JSON
     */
    private parseClarityPrint(repr: string): any {
        // Clarity repr format: (tuple (key1 value1) (key2 value2) ...)
        // This is a simplified parser - production should use proper Clarity parsing
        try {
            // Remove outer parens and parse
            const content = repr.replace(/^\(tuple\s*/, '').replace(/\)$/, '');
            const pairs = content.match(/\(([^()]+)\)/g) || [];

            const result: any = {};
            for (const pair of pairs) {
                const match = pair.match(/\((\S+)\s+(.+)\)/);
                if (match) {
                    const key = match[1].replace(/-/g, '');
                    let value: any = match[2];

                    // Parse value type
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

    private async handleOrderCreated(data: any, txId: string) {
        const exists = await this.ordersService
            .findByStacksId(data.orderid)
            .catch(() => null);

        if (exists) {
            this.logger.log(`Order ${data.orderid} already exists, skipping`);
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
    }

    private async handleOrderConfirmed(data: any) {
        const order = await this.ordersService
            .findByStacksId(data.orderid)
            .catch(() => null);

        if (order) {
            await this.ordersService.markConfirmed(order.id);
            this.logger.log(`Confirmed order: ${data.orderid}`);
        }
    }

    private async handleOrderCancelled(data: any) {
        const order = await this.ordersService
            .findByStacksId(data.orderid)
            .catch(() => null);

        if (order) {
            await this.ordersService.updateStatus(order.id, {
                status: OrderStatus.CANCELLED,
            });
            this.logger.log(`Cancelled order: ${data.orderid}`);
        }
    }

    private async handleOrderRefunded(data: any) {
        const order = await this.ordersService
            .findByStacksId(data.orderid)
            .catch(() => null);

        if (order) {
            await this.ordersService.updateStatus(order.id, {
                status: OrderStatus.REFUNDED,
            });
            this.logger.log(`Refunded order: ${data.orderid}`);
        }
    }

    /**
     * Get current order nonce from contract (read-only call)
     */
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
                ),
            );

            // Parse the response
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
