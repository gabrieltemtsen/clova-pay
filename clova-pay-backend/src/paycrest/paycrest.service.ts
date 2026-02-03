import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
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

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        this.apiUrl = this.configService.get<string>('PAYCREST_API_URL', 'https://api.paycrest.io');
        this.apiKey = this.configService.get<string>('PAYCREST_API_KEY', '');
        this.secret = this.configService.get<string>('PAYCREST_SECRET', '');
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
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.apiUrl}/rates/${token}/${fiat}`, {
                    headers: this.getHeaders(),
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
        try {
            this.logger.log(`Creating Paycrest order: ${JSON.stringify(request)}`);

            const response = await firstValueFrom(
                this.httpService.post(`${this.apiUrl}/orders`, request, {
                    headers: this.getHeaders(),
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
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.apiUrl}/orders/${orderId}`, {
                    headers: this.getHeaders(),
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
        // TODO: Implement HMAC signature verification using this.secret
        // For now, return true in development
        if (this.configService.get('NODE_ENV') === 'development') {
            return true;
        }

        // In production, verify the signature
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', this.secret)
            .update(payload)
            .digest('hex');

        return signature === expectedSignature;
    }
}
