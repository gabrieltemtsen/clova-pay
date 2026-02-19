import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min, IsNotEmpty, Length, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    @ApiProperty({ description: 'The Order ID from Stacks smart contract', example: 1001 })
    @IsNumber()
    @IsInt()
    @Min(1)
    stacksOrderId: number;

    @ApiPropertyOptional({ description: 'The transaction ID on Stacks chain', example: '0x123...' })
    @IsString()
    @IsOptional()
    txId?: string;

    @ApiProperty({ description: 'The Stacks address of the sender', example: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM' })
    @IsString()
    @IsNotEmpty()
    sender: string;

    @ApiProperty({ description: 'The amount in micro-STX (uSTX)', example: 100000000 })
    @IsNumber()
    @Min(0)
    amount: number;

    @ApiProperty({ description: 'The fee in micro-STX (uSTX)', example: 1000000 })
    @IsNumber()
    @Min(0)
    fee: number;

    @ApiProperty({ description: 'The fiat amount in minor units (e.g., kobo, cents)', example: 15000000 })
    @IsNumber()
    @Min(0)
    fiatAmount: number;

    @ApiProperty({ description: 'The 3-letter currency code', example: 'NGN', minLength: 3, maxLength: 3 })
    @IsString()
    @Length(3, 3)
    fiatCurrency: string;

    @ApiProperty({ description: 'Hash of the bank details', example: '0xabc123...' })
    @IsString()
    @IsNotEmpty()
    bankDetailsHash: string;

    @ApiPropertyOptional({ description: 'SIP-010 token contract address (if token order)', example: 'ST1PQ...token' })
    @IsString()
    @IsOptional()
    tokenContract?: string;
}

export class UpdateOrderDto {
    @ApiProperty({ enum: OrderStatus, description: 'The new status of the order' })
    @IsEnum(OrderStatus)
    status: OrderStatus;

    @ApiPropertyOptional({ description: 'Off-ramp provider order ID (Clova Africa orderId)' })
    @IsString()
    @IsOptional()
    offrampOrderId?: string;

    @ApiPropertyOptional({ description: 'Off-ramp provider status' })
    @IsString()
    @IsOptional()
    offrampStatus?: string;
}

export class OrderQueryDto {
    @ApiPropertyOptional({ description: 'Filter by sender address' })
    @IsString()
    @IsOptional()
    sender?: string;

    @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by order status' })
    @IsEnum(OrderStatus)
    @IsOptional()
    status?: OrderStatus;

    @ApiPropertyOptional({ description: 'Number of items to return', default: 50 })
    @IsNumber()
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ description: 'Number of items to skip', default: 0 })
    @IsNumber()
    @IsOptional()
    offset?: number;
}

export class ProcessOrderDto {
    @ApiProperty({ enum: ['cUSD_CELO', 'USDC_BASE', 'USDCX_STACKS'], description: 'Settlement rail asset' })
    @IsString()
    @IsIn(['cUSD_CELO', 'USDC_BASE', 'USDCX_STACKS'])
    asset: 'cUSD_CELO' | 'USDC_BASE' | 'USDCX_STACKS';

    @ApiProperty({ description: 'Amount in crypto units as string', example: '2' })
    @IsString()
    @IsNotEmpty()
    amountCrypto: string;

    @ApiProperty({ description: 'Recipient account name', example: 'Gabriel Temtsen' })
    @IsString()
    @IsNotEmpty()
    accountName: string;

    @ApiProperty({ description: 'Recipient account number', example: '9052390212' })
    @IsString()
    @Length(10, 10)
    accountNumber: string;

    @ApiProperty({ description: 'Recipient bank code', example: '999992' })
    @IsString()
    @IsNotEmpty()
    bankCode: string;
}

export class VerifyRecipientDto {
    @ApiProperty({ description: 'Recipient account number', example: '9052390212' })
    @IsString()
    @Length(10, 10)
    accountNumber: string;

    @ApiProperty({ description: 'Recipient bank code', example: '999992' })
    @IsString()
    @IsNotEmpty()
    bankCode: string;
}
