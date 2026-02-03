export interface StacksEvent {
    tx_id: string;
    tx_status: string;
    block_height: number;
    contract_log?: {
        contract_id: string;
        topic: string;
        value: {
            repr: string;
        };
    };
}

export interface OrderCreatedEvent {
    event: 'order-created';
    orderId: number;
    sender: string;
    amount: number;
    fee: number;
    fiatAmount: number;
    fiatCurrency: string;
    bankDetailsHash: string;
}

export interface OrderConfirmedEvent {
    event: 'order-confirmed';
    orderId: number;
    sender: string;
    netAmount: number;
    fee: number;
    paycrestRef: string;
}

export interface OrderCancelledEvent {
    event: 'order-cancelled';
    orderId: number;
    sender: string;
    refunded: number;
}
