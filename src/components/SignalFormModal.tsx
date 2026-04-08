"use client";

import { useState, useEffect } from "react";
import { Signal, TradeLeg } from "@/types/signal";
import { X, Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScriptSearch } from "@/components/ScriptSearch";

interface SignalFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (signal: Partial<Signal>) => Promise<void>;
    initialData?: Partial<Signal> | null;
}

const emptyLeg: TradeLeg = {
    tokenNumber: "",
    exchange: "NSE",
    symbolName: "",
    quantityLots: 0,
    side: "SELL",
    productType: "NORMAL",
    strategyName: "TradingViewSignals",
    legs: 0,
};

const emptySignal: Partial<Signal> = {
    strategyName: "TradingViewSignals",
    tokenNumber: "",
    exchange: "NSE",
    symbolName: "",
    quantityLots: 0,
    side: "BUY",
    productType: "INTRADAY",
    legs: 0,
    signalStatus: "ACTIVE",
    toBeTradedOn: [],
};

export function SignalFormModal({ isOpen, onClose, onSubmit, initialData }: SignalFormModalProps) {
    const [formData, setFormData] = useState<Partial<Signal>>(emptySignal);
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isEditing = !!(initialData && (initialData as any)._id);

    useEffect(() => {
        if (isOpen) {
            setSaveSuccess(false);
            setErrorMsg(null);
            if (initialData) {
                // Deep copy to avoid mutating parent state, and fill in any missing fields
                const merged: Partial<Signal> = {
                    ...emptySignal,
                    ...JSON.parse(JSON.stringify(initialData)),
                };
                // Ensure toBeTradedOn is always an array
                if (!Array.isArray(merged.toBeTradedOn)) {
                    merged.toBeTradedOn = [];
                }
                setFormData(merged);
            } else {
                setFormData({ ...emptySignal, toBeTradedOn: [] });
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        setSaveSuccess(false);

        try {
            const legsCount = formData.toBeTradedOn?.length || 0;
            const finalLegsCount = legsCount > 0 ? legsCount : 1;

            const dataToSubmit = {
                ...formData,
                legs: finalLegsCount,
                toBeTradedOn: formData.toBeTradedOn?.map((leg) => ({
                    ...leg,
                    legs: finalLegsCount,
                })) || [],
            };

            await onSubmit(dataToSubmit);

            // Show success tick briefly, then close — page data refreshes in parent
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                onClose();
            }, 800);
        } catch (error: any) {
            setErrorMsg(error?.message || "Failed to save signal. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const addLeg = () => {
        setFormData({
            ...formData,
            toBeTradedOn: [...(formData.toBeTradedOn || []), { ...emptyLeg }],
        });
    };

    const removeLeg = (index: number) => {
        const newLegs = [...(formData.toBeTradedOn || [])];
        newLegs.splice(index, 1);
        setFormData({ ...formData, toBeTradedOn: newLegs });
    };

    const updateLeg = (index: number, field: keyof TradeLeg, value: any) => {
        const newLegs = [...(formData.toBeTradedOn || [])];
        newLegs[index] = { ...newLegs[index], [field]: value };
        setFormData({ ...formData, toBeTradedOn: newLegs });
    };

    const handleScriptSelect = (result: any) => {
        setFormData({
            ...formData,
            symbolName: result.tradingSymbol || result.symbol,
            tokenNumber: result.token,
            exchange: result.exchange,
        });
    };

    const handleLegScriptSelect = (index: number, result: any) => {
        const newLegs = [...(formData.toBeTradedOn || [])];
        newLegs[index] = {
            ...newLegs[index],
            symbolName: result.tradingSymbol || result.symbol,
            tokenNumber: result.token,
            exchange: result.exchange,
        };
        setFormData({ ...formData, toBeTradedOn: newLegs });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">{isEditing ? "Edit Signal" : "Add New Signal"}</h2>
                    <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" type="button">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ─── Main Signal Fields ─── */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Script Search */}
                        <div className="space-y-2 lg:col-span-3">
                            <label className="text-sm font-medium">
                                Search Script
                                <span className="ml-1 text-xs text-muted-foreground">
                                    (try &quot;NIFTY FEB&quot; or &quot;NIFTY 10-feb-2025&quot;)
                                </span>
                            </label>
                            <ScriptSearch
                                onSelect={handleScriptSelect}
                                placeholder='e.g. "NIFTY FEB" or "BANKNIFTY 10-feb-2025 CE"'
                                defaultValue={formData.symbolName}
                                exchange={formData.exchange}
                                key={`main-search-${isOpen}-${formData.symbolName}`}
                            />
                        </div>

                        {/* Strategy Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Strategy Name</label>
                            <input
                                required
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={formData.strategyName || ""}
                                onChange={(e) => setFormData({ ...formData, strategyName: e.target.value })}
                            />
                        </div>

                        {/* Symbol — read-only, populated by search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Symbol</label>
                            <input
                                required
                                readOnly
                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm opacity-60 cursor-not-allowed"
                                value={formData.symbolName || ""}
                            />
                        </div>

                        {/* Token Number */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Token Number</label>
                            <input
                                required
                                readOnly
                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm opacity-60 cursor-not-allowed"
                                value={formData.tokenNumber || ""}
                            />
                        </div>

                        {/* Exchange — read-only, shows actual value from API/search */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Exchange</label>
                            <input
                                required
                                readOnly
                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm opacity-60 cursor-not-allowed"
                                value={formData.exchange || ""}
                            />
                        </div>

                        {/* Side */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Side</label>
                            <select
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={formData.side || "BUY"}
                                onChange={(e) => setFormData({ ...formData, side: e.target.value as any })}
                            >
                                <option value="BUY">BUY</option>
                                <option value="SELL">SELL</option>
                                <option value="EXIT">EXIT</option>
                            </select>
                        </div>

                        {/* Product Type */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Product Type</label>
                            <select
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={formData.productType || "INTRADAY"}
                                onChange={(e) => setFormData({ ...formData, productType: e.target.value as any })}
                            >
                                <option value="INTRADAY">INTRADAY</option>
                                <option value="NORMAL">NORMAL</option>
                                <option value="DELIVERY">DELIVERY</option>
                            </select>
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Quantity (Lots)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={formData.quantityLots ?? 0}
                                onChange={(e) =>
                                    setFormData({ ...formData, quantityLots: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={formData.signalStatus || "ACTIVE"}
                                onChange={(e) => setFormData({ ...formData, signalStatus: e.target.value as any })}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                        </div>
                    </div>

                    {/* ─── Strategy Legs ─── */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-lg font-semibold">
                                Strategy Legs
                                {formData.toBeTradedOn && formData.toBeTradedOn.length > 0 && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                        {formData.toBeTradedOn.length}
                                    </span>
                                )}
                            </h3>
                            <button
                                type="button"
                                onClick={addLeg}
                                className="flex items-center space-x-1 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Leg</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.toBeTradedOn?.map((leg, index) => (
                                <div key={index} className="relative rounded-lg border bg-muted/30 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Leg {index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeLeg(index)}
                                            className="rounded-full p-1.5 text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        {/* Leg Script Search */}
                                        <div className="space-y-2 lg:col-span-4">
                                            <label className="text-xs font-medium">Search Leg Script</label>
                                            <ScriptSearch
                                                onSelect={(result) => handleLegScriptSelect(index, result)}
                                                placeholder={`search leg ${index + 1} script...`}
                                                defaultValue={leg.symbolName}
                                                exchange={leg.exchange || "NSE"}
                                                key={`leg-search-${index}-${isOpen}-${leg.symbolName}`}
                                            />
                                        </div>

                                        {/* Leg Symbol */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Symbol</label>
                                            <input
                                                required
                                                readOnly
                                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-60 cursor-not-allowed"
                                                value={leg.symbolName || ""}
                                            />
                                        </div>

                                        {/* Leg Token */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Token</label>
                                            <input
                                                required
                                                readOnly
                                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-60 cursor-not-allowed"
                                                value={leg.tokenNumber || ""}
                                            />
                                        </div>

                                        {/* Leg Exchange */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Exchange</label>
                                            <input
                                                required
                                                readOnly
                                                className="flex w-full rounded-md border border-input bg-muted px-3 py-2 text-sm opacity-60 cursor-not-allowed"
                                                value={leg.exchange || ""}
                                            />
                                        </div>

                                        {/* Leg Strategy Name */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Strategy Name</label>
                                            <input
                                                required
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={leg.strategyName || ""}
                                                onChange={(e) => updateLeg(index, "strategyName", e.target.value)}
                                            />
                                        </div>

                                        {/* Leg Side */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Side</label>
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={leg.side || "BUY"}
                                                onChange={(e) => updateLeg(index, "side", e.target.value)}
                                            >
                                                <option value="BUY">BUY</option>
                                                <option value="SELL">SELL</option>
                                            </select>
                                        </div>

                                        {/* Leg Product Type */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Product Type</label>
                                            <select
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={leg.productType || "INTRADAY"}
                                                onChange={(e) => updateLeg(index, "productType", e.target.value)}
                                            >
                                                <option value="INTRADAY">INTRADAY</option>
                                                <option value="NORMAL">NORMAL</option>
                                                <option value="DELIVERY">DELIVERY</option>
                                            </select>
                                        </div>

                                        {/* Leg Quantity */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">Quantity</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                value={leg.quantityLots ?? 0}
                                                onChange={(e) =>
                                                    updateLeg(index, "quantityLots", parseInt(e.target.value) || 0)
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(!formData.toBeTradedOn || formData.toBeTradedOn.length === 0) && (
                                <div className="text-center text-sm text-muted-foreground p-6 border border-dashed rounded-lg">
                                    No legs added yet. Click &ldquo;Add Leg&rdquo; to add strategy legs.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Footer Actions ─── */}
                    <div className="flex items-center justify-end space-x-2 border-t pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || saveSuccess}
                            className={cn(
                                "flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-50",
                                saveSuccess
                                    ? "bg-green-500 hover:bg-green-500/90"
                                    : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {saveSuccess ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Saved!</span>
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    <span>{loading ? "Saving…" : isEditing ? "Update Signal" : "Save Signal"}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
