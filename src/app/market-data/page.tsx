
export default function MarketDataPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Market Data Backend</h1>
            <p className="text-muted-foreground">
                Status and configuration for the market data backend.
            </p>
            {/* Placeholder content */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="font-semibold leading-none tracking-tight">Backend Status</h3>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">Connected</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
