import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, IsNotEmpty, Length } from 'class-validator';

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
    @IsInt()
    @Min(1)
    stacksOrderId: number;

    @IsString()
    @IsOptional()
    txId?: string;

    @IsString()
    @IsNotEmpty()
    sender: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsNumber()
    @Min(0)
    fee: number;

    @IsNumber()
    @Min(0)
    fiatAmount: number;

    @IsString()
    @Length(3, 3)
    fiatCurrency: string;

    @IsString()
    @IsNotEmpty()
    bankDetailsHash: string;

    @IsString()
    @IsOptional()
    tokenContract?: string;
}

export class UpdateOrderDto {
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
