import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
    PaycrestOrderRequest,
    PaycrestOrderResponse,
    PaycrestRateResponse,
} from './paycrest.types';

@Injectable()
export class PaycrestService {
    private readonly logger = new Logger(PaycrestService.name);
    private readonly apiUrl: string;
    private readonly apiKey: string;
    private readonly secret: string;
    private readonly isMockMode: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.apiUrl = this.configService.get<string>('PAYCREST_API_URL', 'https://api.paycrest.io');
        this.apiKey = this.configService.get<string>('PAYCREST_API_KEY', '');
        this.secret = this.configService.get<string>('PAYCREST_SECRET', '');
        this.isMockMode = this.configService.get<string>('NODE_ENV') === 'development' ||
            this.configService.get<string>('PAYCREST_MOCK_MODE') === 'true';
    }

    private getHeaders() {
        return {
            'Content-Type': 'application/json',
            'API-Key': this.apiKey,
        };
    }

    /**
     * Get current exchange rate for a token/fiat pair
     */
    async getRate(token: string, fiat: string): Promise<PaycrestRateResponse> {
        if (this.isMockMode) {
            this.logger.debug('Returning mock rate');
            return {
                data: {
                    rate: '1500', // 1 STX = 1500 NGN
                    token,
                    fiat,
                },
            };
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.apiUrl}/rates/${token}/${fiat}`, {
                    headers: this.getHeaders(),
                    timeout: 5000,
                }),
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get rate: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create an off-ramp order on Paycrest
     */
    async createOrder(request: PaycrestOrderRequest): Promise<PaycrestOrderResponse> {
        if (this.isMockMode) {
            this.logger.log(`Mock mode: Creating Paycrest order: ${JSON.stringify(request)}`);
            return {
                id: `mock-order-${Date.now()}`,
                status: 'pending',
                receiveAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
                amount: request.amount,
                token: request.token,
                network: request.network,
                rate: request.rate,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

        try {
            this.logger.log(`Creating Paycrest order: ${JSON.stringify(request)}`);

            const response = await firstValueFrom(
                this.httpService.post(`${this.apiUrl}/orders`, request, {
                    headers: this.getHeaders(),
                    timeout: 10000,
                }),
            );

            this.logger.log(`Paycrest order created: ${response.data.id}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to create order: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get order status from Paycrest
     */
    async getOrder(orderId: string): Promise<PaycrestOrderResponse> {
        if (this.isMockMode) {
            return {
                id: orderId,
                status: 'processed',
                receiveAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
                amount: '100',
                token: 'STX',
                network: 'stacks',
                rate: '1500',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.apiUrl}/orders/${orderId}`, {
                    headers: this.getHeaders(),
                    timeout: 5000,
                }),
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to get order: ${error.message}`);
            throw error;
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        // In local mock mode, allow without signature if secret is missing
        if (this.isMockMode && !this.secret) {
            this.logger.warn('Mock mode: Skipping webhook signature verification');
            return true;
        }

        if (!signature || !this.secret) {
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', this.secret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            this.logger.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }
}
