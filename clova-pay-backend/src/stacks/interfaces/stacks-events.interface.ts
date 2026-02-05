export interface StacksEvent {
    txId?: string;
}

export interface OrderCreatedEvent extends StacksEvent {
    orderid: number;
    sender: string;
    amount: number;
    fee: number;
    fiatamount: number;
    fiatcurrency: string;
    bankdetailshash: string;
}

export interface OrderConfirmedEvent extends StacksEvent {
    orderid: number;
}

export interface OrderCancelledEvent extends StacksEvent {
    orderid: number;
}

export interface OrderRefundedEvent extends StacksEvent {
    orderid: number;
}
