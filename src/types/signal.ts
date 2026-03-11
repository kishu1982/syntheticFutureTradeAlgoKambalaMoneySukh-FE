export interface TradeLeg {
    tokenNumber: string;
    exchange: string;
    symbolName: string;
    quantityLots: number;
    side: "BUY" | "SELL" | "EXIT";
    productType: "INTRADAY" | "NORMAL" | "DELIVERY";
    strategyName: string;
    legs: number;
}

export interface Signal {
    _id: string;
    strategyName: string;
    tokenNumber: string;
    exchange: string;
    symbolName: string;
    quantityLots: number;
    side: "BUY" | "SELL" | "EXIT";
    productType: "INTRADAY" | "NORMAL" | "DELIVERY";
    legs: number;
    signalStatus: "ACTIVE" | "INACTIVE";
    isEnabled: boolean;
    toBeTradedOn: TradeLeg[];
    createdAt: string;
    updatedAt: string;
}
