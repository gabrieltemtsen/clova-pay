export interface ClovaAfricaQuoteResponse {
  quoteId: string;
  rate: string;
  feeNgn: string;
  receiveNgn: string;
  expiresAt?: number;
}

export interface ClovaAfricaOrderRequest {
  asset: 'cUSD_CELO' | 'USDC_BASE' | 'USDCX_STACKS';
  amountCrypto: string;
  recipient: {
    accountName: string;
    accountNumber: string;
    bankCode: string;
  };
}

export interface ClovaAfricaOrderResponse {
  orderId: string;
  status: string;
  depositAddress?: string;
  receiveNgn?: string;
}

export interface ClovaAfricaRecipientResolveResponse {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  verified: boolean;
}
