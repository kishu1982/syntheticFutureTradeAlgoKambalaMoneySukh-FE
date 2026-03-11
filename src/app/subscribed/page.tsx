
export default function SubscribedPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">WebSocket Subscribed Symbols</h1>
            <p className="text-muted-foreground">
                Manage your subscribed symbols for real-time updates.
            </p>
            {/* Placeholder content */}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="font-semibold leading-none tracking-tight">Active Subscriptions</h3>
                    <p className="text-sm text-muted-foreground">No active subscriptions.</p>
                </div>
            </div>
        </div>
    );
}
