export interface PaycrestOrderRequest {
  amount: string; // Amount in token units
  token: string; // Token symbol (e.g., "USDC")
  rate: string; // Exchange rate
  network: string; // Blockchain network
  recipient: {
    accountIdentifier: string; // Bank account number
    accountName: string; // Account holder name
    institution: string; // Bank code/name
    memo?: string;
  };
  returnAddress: string; // Address for refunds
  reference?: string; // Our order ID
}

export interface PaycrestOrderResponse {
  id: string;
  status: string;
  receiveAddress: string;
  amount: string;
  token: string;
  network: string;
  rate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaycrestWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    txHash?: string;
    amount?: string;
    completedAt?: string;
  };
}

export interface PaycrestRateResponse {
  data: {
    rate: string;
    token: string;
    fiat: string;
  };
}
