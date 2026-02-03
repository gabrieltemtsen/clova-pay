import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SETTLED = 'SETTLED',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    REFUNDED = 'REFUNDED',
    FAILED = 'FAILED',
}

export class CreateOrderDto {
    @IsNumber()
    stacksOrderId: number;

    @IsString()
    @IsOptional()
    txId?: string;

    @IsString()
    sender: string;

    @IsNumber()
    amount: number;

    @IsNumber()
    fee: number;

    @IsNumber()
    fiatAmount: number;

    @IsString()
    fiatCurrency: string;

    @IsString()
    bankDetailsHash: string;

    @IsString()
    @IsOptional()
    tokenContract?: string;
}

export class UpdateOrderStatusDto {
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @IsString()
    @IsOptional()
    paycrestOrderId?: string;

    @IsString()
    @IsOptional()
    paycrestStatus?: string;
}

export class OrderQueryDto {
    @IsString()
    @IsOptional()
    sender?: string;

    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsNumber()
    @IsOptional()
    offset?: number;
}
