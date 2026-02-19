import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { UpdateOrderDto, OrderStatus } from './dto/order.dto';
import { ClovaAfricaService } from '../clova-africa/clova-africa.service';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ConfigService } from '@nestjs/config';

const mockOrdersService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByStacksId: jest.fn(),
  updateStatus: jest.fn(),
  getStats: jest.fn(),
  markProcessing: jest.fn(),
  markSettled: jest.fn(),
  markFailed: jest.fn(),
};

const mockClovaAfricaService = {
  createOrder: jest.fn(),
  getOrder: jest.fn(),
  resolveRecipient: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: ClovaAfricaService, useValue: mockClovaAfricaService },
        { provide: ConfigService, useValue: { get: jest.fn(() => 'test-admin-key') } },
        ApiKeyGuard,
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of orders with stringified BigInts', async () => {
      const result = [
        {
          id: '1',
          amount: BigInt(100),
          fee: BigInt(1),
          fiatAmount: BigInt(10),
          status: OrderStatus.PENDING,
        },
      ];
      mockOrdersService.findAll.mockResolvedValue(result);

      const response = await controller.findAll({});
      expect(response).toEqual([
        {
          ...result[0],
          amount: '100',
          fee: '1',
          fiatAmount: '10',
          offrampOrderId: null,
          offrampStatus: null,
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a single order', async () => {
      const result = {
        id: '1',
        amount: BigInt(100),
        fee: BigInt(1),
        fiatAmount: BigInt(10),
      };
      mockOrdersService.findOne.mockResolvedValue(result);

      const response = await controller.findOne('1');
      expect(response).toEqual({
        ...result,
        amount: '100',
        fee: '1',
        fiatAmount: '10',
        offrampOrderId: null,
        offrampStatus: null,
      });
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const dto: UpdateOrderDto = { status: OrderStatus.PROCESSING };
      const result = {
        id: '1',
        amount: BigInt(100),
        fee: BigInt(1),
        fiatAmount: BigInt(10),
        status: OrderStatus.PROCESSING,
      };
      mockOrdersService.updateStatus.mockResolvedValue(result);

      const response = await controller.updateStatus('1', dto);
      expect(response.status).toBe(OrderStatus.PROCESSING);
    });
  });
});
