import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const adminApiKey = 'test-api-key';

  beforeAll(async () => {
    // Set env vars for testing
    process.env.ADMIN_API_KEY = adminApiKey;
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    await prisma.order.deleteMany(); // Clean DB
  });

  afterAll(async () => {
    await prisma.order.deleteMany();
    await app.close();
  });

  it('/orders (GET) - should return empty list initially', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual([]);
      });
  });

  let createdOrderId: string;

  it('Should create an order via Service (simulate Stacks Listener)', async () => {
    // We simulate the service call directly or just use Prisma to seed
    const order = await prisma.order.create({
      data: {
        stacksOrderId: 999,
        sender: 'ST123',
        amount: 100n,
        fee: 10n,
        fiatAmount: 1000n,
        fiatCurrency: 'NGN',
        bankDetailsHash: 'hash',
        status: 'PENDING',
      },
    });
    createdOrderId = order.id;
    expect(createdOrderId).toBeDefined();
  });

  it('/orders (GET) - should return the created order', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveLength(1);
        expect(res.body[0].stacksOrderId).toBe(999);
        // Check BigInt conversion
        expect(typeof res.body[0].amount).toBe('string');
      });
  });

  it('/orders/:id/process (POST) - should fail without API Key', () => {
    return request(app.getHttpServer()).post(`/orders/${createdOrderId}/process`).expect(401);
  });

  it('/orders/:id/process (POST) - should succeed with API Key', () => {
    return (
      request(app.getHttpServer())
        .post(`/orders/${createdOrderId}/process`)
        .set('x-api-key', adminApiKey)
        .expect(200)
        // Mock mode in Paycrest service should handle this
        .expect((res) => {
          expect(res.body.status).toBe('PROCESSING');
          expect(res.body.message).toContain('queued');
        })
    );
  });
});
