import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { OrderStatus } from './dto/order.dto';
import { Prisma } from '@prisma/client';

const mockPrismaService = {
    order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
};

describe('OrdersService', () => {
    let service: OrdersService;
    let prisma: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
        prisma = module.get<PrismaService>(PrismaService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        const createDto = {
            stacksOrderId: 1,
            sender: 'ST123',
            amount: 100,
            fee: 1,
            fiatAmount: 1500,
            fiatCurrency: 'NGN',
            bankDetailsHash: 'hash',
        };

        it('should create an order successfully', async () => {
            const result = { id: 'order-1', ...createDto, status: OrderStatus.PENDING };
            mockPrismaService.order.create.mockResolvedValue(result);

            expect(await service.create(createDto as any)).toEqual(result);
            expect(mockPrismaService.order.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if order already exists', async () => {
            const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
                code: 'P2002',
                clientVersion: '4.0.0',
            });
            mockPrismaService.order.create.mockRejectedValue(error);

            await expect(service.create(createDto as any)).rejects.toThrow(ConflictException);
        });

        it('should throw InternalServerErrorException on unknown error', async () => {
            mockPrismaService.order.create.mockRejectedValue(new Error('Unknown'));

            await expect(service.create(createDto as any)).rejects.toThrow(InternalServerErrorException);
        });
    });

    describe('findOne', () => {
        it('should return an order if found', async () => {
            const result = { id: 'order-1' };
            mockPrismaService.order.findUnique.mockResolvedValue(result);

            expect(await service.findOne('order-1')).toEqual(result);
        });

        it('should throw NotFoundException if not found', async () => {
            mockPrismaService.order.findUnique.mockResolvedValue(null);

            await expect(service.findOne('order-1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateStatus', () => {
        it('should update status successfully', async () => {
            const order = { id: 'order-1', status: OrderStatus.PENDING };
            mockPrismaService.order.findUnique.mockResolvedValue(order);
            mockPrismaService.order.update.mockResolvedValue({ ...order, status: OrderStatus.PROCESSING });

            const result = await service.updateStatus('order-1', { status: OrderStatus.PROCESSING });
            expect(result.status).toBe(OrderStatus.PROCESSING);
        });
    });
});
