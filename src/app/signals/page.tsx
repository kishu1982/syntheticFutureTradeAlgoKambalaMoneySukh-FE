"use client";

import { useEffect, useState } from "react";
import { Signal, TradeLeg } from "@/types/signal";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Clock, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Plus, Pencil, Trash2 } from "lucide-react";
import { SignalFormModal } from "@/components/SignalFormModal";
import { ScriptSearch } from "@/components/ScriptSearch";

export default function SignalsPage() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSignal, setEditingSignal] = useState<Partial<Signal> | null>(null);

    const fetchSignals = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/strategy/tradingview-config`
            );
            if (!response.ok) {
                throw new Error("Failed to fetch signals");
            }
            const data = await response.json();
            setSignals(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSignals();
        // Optional: Set up polling
        const interval = setInterval(fetchSignals, 50000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveSignal = async (signalData: Partial<Signal>) => {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/strategy/tradingview-config`;

        // Sanitize data: remove _id, isEnabled, createdAt, updatedAt
        const { _id, isEnabled, createdAt, updatedAt, ...rest } = signalData as any;

        // Sanitize legs per API requirement
        const sanitizedLegs = rest.toBeTradedOn?.map((leg: any) => {
            const { productType, strategyName, legs, ...legRest } = leg;
            return legRest;
        });

        const payload = {
            ...rest,
            toBeTradedOn: sanitizedLegs,
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || "Failed to save signal");
        }

        // Background refresh — modal handles its own close animation
        fetchSignals();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this signal?")) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/strategy/tradingview-config/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || "Failed to delete signal");
            }

            await fetchSignals(); // Refresh list
        } catch (error) {
            console.error("Error deleting signal:", error);
            alert(error instanceof Error ? error.message : "Failed to delete signal");
        }
    };

    const handleEdit = (signal: Signal) => {
        setEditingSignal(signal);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingSignal(null);
        setIsModalOpen(true);
    };

    const handleSearchSelect = (result: any) => {
        setEditingSignal({
            symbolName: result.Symbol,
            tokenNumber: result.Token,
            exchange: result.Exchange,
            // Set defaults for new signal
            strategyName: "TradingViewSignals",
            quantityLots: 0,
            side: "BUY",
            productType: "INTRADAY",
            legs: 0,
            signalStatus: "ACTIVE",
            toBeTradedOn: [],
        });
        setIsModalOpen(true);
    };

    if (loading && signals.length === 0) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && signals.length === 0) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center space-y-4 text-destructive">
                <AlertCircle className="h-12 w-12" />
                <p className="text-lg font-medium">{error}</p>
                <button
                    onClick={fetchSignals}
                    className="rounded-md bg-destructive/10 px-4 py-2 text-sm font-medium hover:bg-destructive/20"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Active Signals</h1>
                    <p className="text-muted-foreground">
                        Live trading signals and configurations.
                    </p>
                </div>
                <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0">
                    <div className="w-full md:w-64">
                        <ScriptSearch
                            onSelect={handleSearchSelect}
                            placeholder="Quick add via search..."
                        />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={handleAdd}
                            className="flex items-center space-x-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Signal</span>
                        </button>
                        <button
                            onClick={fetchSignals}
                            className="flex items-center space-x-2 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-secondary/80"
                        >
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {signals.map((signal) => (
                    <SignalCard
                        key={signal._id}
                        signal={signal}
                        onEdit={() => handleEdit(signal)}
                        onDelete={() => handleDelete(signal._id)}
                    />
                ))}
            </div>

            {signals.length === 0 && !loading && (
                <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                    No signals found.
                </div>
            )}

            <SignalFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSaveSignal}
                initialData={editingSignal}
            />
        </div>
    );
}

function SignalCard({ signal, onEdit, onDelete }: { signal: Signal; onEdit: () => void; onDelete: () => void }) {
    const [showLegs, setShowLegs] = useState(false);
    const isBuy = signal.side === "BUY";
    const isExit = signal.side === "EXIT";
    const hasLegs = signal.toBeTradedOn && signal.toBeTradedOn.length > 0;

    return (
        <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
            <div className="absolute right-2 top-2 z-10 hidden space-x-1 opacity-0 transition-opacity group-hover:block group-hover:opacity-100">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="rounded-full bg-secondary p-1.5 text-secondary-foreground hover:bg-secondary/80"
                    title="Edit"
                >
                    <Pencil className="h-3 w-3" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="rounded-full bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20"
                    title="Delete"
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                isBuy ? "bg-green-500" : isExit ? "bg-orange-500" : "bg-red-500"
            )} />

            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">{signal.symbolName}</span>
                            <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                isBuy
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                    : isExit
                                        ? "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                        : "bg-red-500/10 text-red-700 dark:text-red-400"
                            )}>
                                {signal.side}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{signal.strategyName}</p>
                    </div>
                    {isBuy ? (
                        <ArrowUpRight className="h-5 w-5 text-green-500" />
                    ) : isExit ? (
                        <RefreshCw className="h-5 w-5 text-orange-500" />
                    ) : (
                        <ArrowDownRight className="h-5 w-5 text-red-500" />
                    )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">Exchange</p>
                        <p className="font-medium">{signal.exchange}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Product</p>
                        <p className="font-medium">{signal.productType}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Quantity</p>
                        <p className="font-medium">{signal.quantityLots} Lots</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Legs</p>
                        <p className="font-medium">{signal.legs}</p>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <time dateTime={signal.updatedAt}>
                            {new Date(signal.updatedAt).toLocaleTimeString()}
                        </time>
                    </div>
                    {hasLegs && (
                        <button
                            onClick={() => setShowLegs(!showLegs)}
                            className="flex items-center text-xs text-primary hover:underline"
                        >
                            {showLegs ? "Hide Legs" : "Show Legs"}
                            {showLegs ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                        </button>
                    )}
                </div>

                {hasLegs && showLegs && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                        {signal.toBeTradedOn.map((leg, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded">
                                <div>
                                    <p className="font-medium">{leg.symbolName}</p>
                                    <p className="text-xs text-muted-foreground">{leg.strategyName}</p>
                                </div>
                                <div className="text-right">
                                    <span className={cn(
                                        "text-xs font-medium px-1.5 py-0.5 rounded",
                                        leg.side === 'BUY'
                                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                            : "bg-red-500/10 text-red-700 dark:text-red-400"
                                    )}>
                                        {leg.side}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1">{leg.quantityLots} Lots</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
