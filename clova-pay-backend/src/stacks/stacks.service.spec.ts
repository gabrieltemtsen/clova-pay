import { Test, TestingModule } from '@nestjs/testing';
import { StacksService } from './stacks.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { OrdersService } from '../orders/orders.service';
import { of, throwError } from 'rxjs';
import { OrderStatus } from '../orders/dto/order.dto';

const mockConfigService = {
    get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'STACKS_API_URL') return 'http://test-api';
        if (key === 'CONTRACT_ADDRESS') return 'ST123';
        if (key === 'CONTRACT_NAME') return 'contract';
        return defaultValue;
    }),
};

const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
};

const mockOrdersService = {
    findByStacksId: jest.fn(),
    create: jest.fn(),
    markConfirmed: jest.fn(),
    updateStatus: jest.fn(),
};

describe('StacksService', () => {
    let service: StacksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StacksService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: HttpService, useValue: mockHttpService },
                { provide: OrdersService, useValue: mockOrdersService },
            ],
        }).compile();

        service = module.get<StacksService>(StacksService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('pollEvents', () => {
        it('should fetch and process events', async () => {
            const event = {
                contract_log: {
                    value: {
                        repr: '(tuple (event "order-created") (orderid u1) (sender "ST1") (amount u100) (fee u1) (fiatamount u1000) (fiatcurrency "NGN") (bankdetailshash "hash"))',
                    },
                },
                tx_id: '0x123',
            };

            mockHttpService.get.mockReturnValue(of({ data: { results: [event] } }));
            mockOrdersService.findByStacksId.mockRejectedValue(new Error('Not found')); // Simulate not found so it creates

            await service.pollEvents();

            expect(mockOrdersService.create).toHaveBeenCalledWith(expect.objectContaining({
                stacksOrderId: 1,
                sender: 'ST1',
                fiatCurrency: 'NGN',
            }));
        });

        it('should handle order-confirmed event', async () => {
            const event = {
                contract_log: {
                    value: {
                        repr: '(tuple (event "order-confirmed") (orderid u1))',
                    },
                },
                tx_id: '0x123',
            };

            mockHttpService.get.mockReturnValue(of({ data: { results: [event] } }));
            mockOrdersService.findByStacksId.mockResolvedValue({ id: 'local-id', status: OrderStatus.PENDING });

            await service.pollEvents();

            expect(mockOrdersService.markConfirmed).toHaveBeenCalledWith('local-id');
        });

        it('should handle http errors gracefully', async () => {
            mockHttpService.get.mockReturnValue(throwError(() => new Error('API Error')));
            await expect(service.pollEvents()).rejects.toThrow('API Error');
        });
    });

    describe('getOrderNonce', () => {
        it('should return nonce from contract', async () => {
            mockHttpService.post.mockReturnValue(of({ data: { result: '(ok u5)' } }));
            const nonce = await service.getOrderNonce();
            expect(nonce).toBe(5);
        });

        it('should return 0 on error', async () => {
            mockHttpService.post.mockReturnValue(throwError(() => new Error('API Error')));
            const nonce = await service.getOrderNonce();
            expect(nonce).toBe(0);
        });
    });
});
