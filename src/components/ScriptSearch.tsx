"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScriptSearchResult {
    exchange: string;
    token: string;
    symbol: string;
    tradingSymbol: string;
    expiry: string | null;
    instrument: string;
    optionType: string | null;
    strikePrice: number | null;
    lotSize: number;
    tickSize: number;
}

interface ScriptSearchProps {
    onSelect: (result: ScriptSearchResult) => void;
    exchange?: string;
    placeholder?: string;
    className?: string;
    defaultValue?: string;
}

// Month aliases map for smart date parsing
const MONTH_MAP: Record<string, string> = {
    jan: "jan", january: "jan",
    feb: "feb", february: "feb",
    mar: "mar", march: "mar",
    apr: "apr", april: "apr",
    may: "may",
    jun: "jun", june: "jun",
    jul: "jul", july: "jul",
    aug: "aug", august: "aug",
    sep: "sep", september: "sep", sept: "sep",
    oct: "oct", october: "oct",
    nov: "nov", november: "nov",
    dec: "dec", december: "dec",
};

// Numeric month to abbreviation
const NUM_MONTH_MAP: Record<string, string> = {
    "01": "jan", "02": "feb", "03": "mar", "04": "apr",
    "05": "may", "06": "jun", "07": "jul", "08": "aug",
    "09": "sep", "10": "oct", "11": "nov", "12": "dec",
    "1": "jan", "2": "feb", "3": "mar", "4": "apr",
    "5": "may", "6": "jun", "7": "jul", "8": "aug",
    "9": "sep",
};

/**
 * Normalize a single token extracted from user query into searchable keywords.
 * e.g. "10-feb-2025" => ["10", "feb", "2025"]
 * e.g. "february" => ["feb"]
 * e.g. "10/02/2025" => ["10", "feb", "2025"]
 */
function normalizeToken(token: string): string[] {
    const lower = token.toLowerCase().trim();
    if (!lower) return [];

    // Date format: dd-mmm-yyyy or d-mmm-yy or similar with dashes/slashes
    const dateWithDashes = lower.match(/^(\d{1,2})[-\/](\w{2,9})[-\/](\d{2,4})$/);
    if (dateWithDashes) {
        const [, day, monthPart, year] = dateWithDashes;
        const month = MONTH_MAP[monthPart] || NUM_MONTH_MAP[monthPart] || monthPart;
        return [day.padStart(2, "0"), month, year.length === 2 ? `20${year}` : year];
    }

    // Date format: dd-mm or dd/mm (no year)
    const dateShort = lower.match(/^(\d{1,2})[-\/](\d{1,2})$/);
    if (dateShort) {
        const [, day, month] = dateShort;
        return [day.padStart(2, "0"), NUM_MONTH_MAP[month] || month];
    }

    // Pure numeric month dd-mm-yyyy
    const numericDate = lower.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
    if (numericDate) {
        const [, day, month, year] = numericDate;
        return [day.padStart(2, "0"), NUM_MONTH_MAP[month] || month, year.length === 2 ? `20${year}` : year];
    }

    // Month name
    if (MONTH_MAP[lower]) {
        return [MONTH_MAP[lower]];
    }

    return [lower];
}

/**
 * Parse user's full query into separate normalized tokens for client-side filtering.
 * Returns { primaryKeyword: string, filterTokens: string[] }
 * primaryKeyword → sent to the API (the most "symbol-like" term)
 * filterTokens   → all tokens used for client-side filtering
 */
function parseQuery(query: string): { primaryKeyword: string; filterTokens: string[] } {
    const raw = query.trim().split(/\s+/).filter(Boolean);
    const allTokens: string[] = [];

    for (const part of raw) {
        allTokens.push(...normalizeToken(part));
    }

    // The primary keyword is the first raw word (the main symbol name like "nifty")
    const primaryKeyword = raw[0] || "";
    return { primaryKeyword, filterTokens: allTokens };
}

/**
 * Client-side fuzzy filter: result must match ALL filterTokens in at least one of its fields.
 */
function matchesAllTokens(result: ScriptSearchResult, filterTokens: string[]): boolean {
    if (!filterTokens.length) return true;

    // Build a searchable string from all relevant fields
    const haystack = [
        result.tradingSymbol || "",
        result.symbol || "",
        result.expiry || "",
        result.exchange || "",
        result.instrument || "",
        result.optionType || "",
        result.strikePrice?.toString() || "",
        result.token || "",
    ]
        .join(" ")
        .toLowerCase();

    return filterTokens.every((token) => haystack.includes(token));
}

/**
 * Highlight matching portions in a string for display.
 */
function highlightMatch(text: string, tokens: string[]): React.ReactNode {
    if (!text || !tokens.length) return text;

    // Simple highlight: find first matching token and bold it
    const lower = text.toLowerCase();
    for (const token of tokens) {
        const idx = lower.indexOf(token);
        if (idx !== -1) {
            return (
                <>
                    {text.slice(0, idx)}
                    <mark className="bg-primary/20 text-primary rounded-sm px-0.5">
                        {text.slice(idx, idx + token.length)}
                    </mark>
                    {text.slice(idx + token.length)}
                </>
            );
        }
    }
    return text;
}

export function ScriptSearch({
    onSelect,
    exchange,
    placeholder = "Search script...",
    className,
    defaultValue,
}: ScriptSearchProps) {
    const [query, setQuery] = useState(defaultValue || "");
    const [results, setResults] = useState<ScriptSearchResult[]>([]);
    const [filteredResults, setFilteredResults] = useState<ScriptSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedExchange, setSelectedExchange] = useState(exchange || "NSE");
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const debouncedQuery = useDebounce(query, 400);

    // Sync defaultValue
    useEffect(() => {
        if (defaultValue !== undefined && defaultValue !== query) {
            setQuery(defaultValue);
        }
    }, [defaultValue]);

    // Sync exchange prop
    useEffect(() => {
        if (exchange) setSelectedExchange(exchange);
    }, [exchange]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch from API using primary keyword, then client-side filter
    useEffect(() => {
        const fetchScripts = async () => {
            const trimmed = debouncedQuery.trim();
            if (!trimmed || trimmed.length < 2) {
                setResults([]);
                setFilteredResults([]);
                setShowResults(false);
                return;
            }

            const { primaryKeyword, filterTokens } = parseQuery(trimmed);

            if (!primaryKeyword || primaryKeyword.length < 2) {
                // Only date tokens typed, can't search without a base symbol
                setShowResults(true);
                return;
            }

            setLoading(true);
            try {
                const params = new URLSearchParams({
                    symbol: primaryKeyword,
                    exchange: selectedExchange,
                });
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_BACKEND_URL}/market/search?${params}`
                );
                if (response.ok) {
                    const data = await response.json();
                    const allResults: ScriptSearchResult[] = Array.isArray(data) ? data : [];
                    setResults(allResults);

                    // Apply client-side filter with ALL tokens
                    const filtered = filterTokens.length > 1
                        ? allResults.filter((r) => matchesAllTokens(r, filterTokens))
                        : allResults;

                    setFilteredResults(filtered);
                    setShowResults(true);
                    setActiveIndex(-1);
                }
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchScripts();
    }, [debouncedQuery, selectedExchange]);

    // Re-filter locally whenever raw results change or query changes (instant)
    useEffect(() => {
        if (!results.length) return;
        const trimmed = query.trim();
        if (!trimmed) {
            setFilteredResults(results);
            return;
        }
        const { filterTokens } = parseQuery(trimmed);
        const filtered = filterTokens.length > 1
            ? results.filter((r) => matchesAllTokens(r, filterTokens))
            : results;
        setFilteredResults(filtered);
    }, [query, results]);

    const handleSelect = (result: ScriptSearchResult) => {
        setQuery(result.tradingSymbol || result.symbol);
        setShowResults(false);
        setActiveIndex(-1);
        onSelect(result);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setFilteredResults([]);
        setShowResults(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showResults || !filteredResults.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(filteredResults[activeIndex]);
        } else if (e.key === "Escape") {
            setShowResults(false);
            setActiveIndex(-1);
        }
    };

    const { filterTokens: displayTokens } = query.trim().length > 1
        ? parseQuery(query)
        : { filterTokens: [] };

    const exchanges = ["NSE", "NFO", "BSE", "BFO", "MCX"];

    return (
        <div ref={wrapperRef} className={cn("relative flex gap-2", className)}>
            <select
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
                {exchanges.map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                ))}
            </select>

            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.trim().length >= 2) {
                            setShowResults(true);
                        } else {
                            setShowResults(false);
                        }
                    }}
                    onFocus={() => {
                        if (filteredResults.length > 0) setShowResults(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!loading && query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2.5 top-2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showResults && (
                <div className="absolute left-0 right-0 top-full z-[200] mt-1 w-full overflow-hidden rounded-md border bg-background text-popover-foreground shadow-lg ring-1 ring-black/5">
                    {filteredResults.length > 0 ? (
                        <>
                            {/* Header hint */}
                            <div className="flex items-center justify-between border-b px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
                                <span>
                                    {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""}
                                    {displayTokens.length > 1 && (
                                        <> matching: <span className="font-medium text-primary">{displayTokens.join(" + ")}</span></>
                                    )}
                                </span>
                                <span className="text-[10px]">↑↓ navigate · Enter select</span>
                            </div>
                            <ul className="max-h-64 overflow-y-auto p-1">
                                {filteredResults.map((result, index) => (
                                    <li
                                        key={`${result.token}-${index}`}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSelect(result)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
                                            activeIndex === index
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        <div className="flex flex-col w-full gap-0.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-base leading-tight">
                                                    {highlightMatch(result.tradingSymbol || result.symbol, displayTokens)}
                                                </span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {result.optionType && (
                                                        <span className={cn(
                                                            "inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold",
                                                            result.optionType === "CE"
                                                                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                                                                : result.optionType === "PE"
                                                                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                                                    : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {result.optionType}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                        {result.exchange}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                                <span>Tok: <span className="text-foreground/70">{result.token}</span></span>
                                                {result.expiry && (
                                                    <span>
                                                        Exp: <span className="text-foreground/70">
                                                            {highlightMatch(result.expiry, displayTokens)}
                                                        </span>
                                                    </span>
                                                )}
                                                {result.strikePrice != null && result.strikePrice !== 0 && (
                                                    <span>Strike: <span className="text-foreground/70">{result.strikePrice}</span></span>
                                                )}
                                                {result.instrument && (
                                                    <span className="text-foreground/50">{result.instrument}</span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        !loading && query.trim().length >= 2 && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                No scripts found for &ldquo;{query}&rdquo;
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
