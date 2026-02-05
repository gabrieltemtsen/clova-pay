import { Test, TestingModule } from '@nestjs/testing';
import { PaycrestService } from './paycrest.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import * as crypto from 'crypto';

const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'PAYCREST_API_URL') return 'http://api.paycrest';
        if (key === 'PAYCREST_API_KEY') return 'key';
        if (key === 'PAYCREST_SECRET') return 'secret';
        if (key === 'NODE_ENV') return 'test'; // Not development, so not mock mode by default
        if (key === 'PAYCREST_MOCK_MODE') return 'false';
        return defaultValue;
    }),
};

const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
};

describe('PaycrestService', () => {
    let service: PaycrestService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaycrestService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HttpService, useValue: mockHttpService },
            ],
        }).compile();

        service = module.get<PaycrestService>(PaycrestService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getRate', () => {
        it('should fetch rate from API', async () => {
            const result = { data: { rate: '1500', token: 'STX', fiat: 'NGN' } };
            mockHttpService.get.mockReturnValue(of({ data: result }));

            const rate = await service.getRate('STX', 'NGN');
            expect(rate).toEqual(result);
            expect(mockHttpService.get).toHaveBeenCalledWith(
                'http://api.paycrest/rates/STX/NGN',
                expect.any(Object),
            );
        });

        it('should throw error on failure', async () => {
            mockHttpService.get.mockReturnValue(throwError(() => new Error('API Error')));
            await expect(service.getRate('STX', 'NGN')).rejects.toThrow('API Error');
        });
    });

    describe('createOrder', () => {
        const request = {
            amount: '100',
            token: 'STX',
            rate: '1500',
            network: 'stacks',
            recipient: {
                accountIdentifier: '123',
                accountName: 'John',
                institution: 'Bank',
            },
            returnAddress: 'ST123',
        };

        it('should create order via API', async () => {
            const result = { id: 'order-1', status: 'pending' };
            mockHttpService.post.mockReturnValue(of({ data: result }));

            const response = await service.createOrder(request);
            expect(response).toEqual(result);
            expect(mockHttpService.post).toHaveBeenCalled();
        });
    });

    describe('verifyWebhookSignature', () => {
        const payload = JSON.stringify({ event: 'test' });
        const secret = 'secret';

        it('should return true for valid signature', () => {
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            expect(service.verifyWebhookSignature(payload, signature)).toBe(true);
        });

        it('should return false for invalid signature', () => {
            expect(service.verifyWebhookSignature(payload, 'invalid')).toBe(false);
        });
    });
});
