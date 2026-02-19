import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ClovaAfricaOrderRequest, ClovaAfricaOrderResponse, ClovaAfricaQuoteResponse } from './clova-africa.types';

@Injectable()
export class ClovaAfricaService {
  private readonly logger = new Logger(ClovaAfricaService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get<string>('CLOVA_AFRICA_API_URL', 'https://clova-pay-africa-production.up.railway.app');
    this.apiKey = this.configService.get<string>('CLOVA_AFRICA_API_KEY', '');
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
    };
  }

  async getRate(asset: 'cUSD_CELO' | 'USDC_BASE' | 'USDCX_STACKS', amountCrypto: string): Promise<ClovaAfricaQuoteResponse> {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.apiUrl}/v1/quotes`,
        { asset, amountCrypto, destinationCurrency: 'NGN' },
        { headers: this.getHeaders(), timeout: 10000 },
      ),
    );

    return {
      quoteId: String(response.data.quoteId),
      rate: String(response.data.rate || '0'),
      feeNgn: String(response.data.feeNgn || '0'),
      receiveNgn: String(response.data.receiveNgn || '0'),
      expiresAt: response.data.expiresAt ? Number(response.data.expiresAt) : undefined,
    };
  }

  async createOrder(input: ClovaAfricaOrderRequest): Promise<ClovaAfricaOrderResponse> {
    this.logger.log(`Creating Clova Africa order for asset=${input.asset} amount=${input.amountCrypto}`);
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.apiUrl}/v1/orders`,
        input,
        { headers: this.getHeaders(), timeout: 15000 },
      ),
    );

    return {
      orderId: String(response.data.orderId),
      status: String(response.data.status || 'awaiting_deposit'),
      depositAddress: response.data.depositAddress ? String(response.data.depositAddress) : undefined,
      receiveNgn: response.data.receiveNgn ? String(response.data.receiveNgn) : undefined,
    };
  }

  async getOrder(orderId: string): Promise<ClovaAfricaOrderResponse> {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.apiUrl}/v1/orders/${orderId}`,
        { headers: this.getHeaders(), timeout: 10000 },
      ),
    );

    return {
      orderId: String(response.data.orderId || orderId),
      status: String(response.data.status || 'unknown'),
      depositAddress: response.data.depositAddress ? String(response.data.depositAddress) : undefined,
      receiveNgn: response.data.receiveNgn ? String(response.data.receiveNgn) : undefined,
    };
  }
}
