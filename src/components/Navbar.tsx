"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LineChart, Radio, Database } from "lucide-react";

const navItems = [
    {
        title: "TradingView Signals",
        href: "/signals",
        icon: LineChart,
    },
    {
        title: "WebSocket Subscribed",
        href: "/subscribed",
        icon: Radio,
    },
    {
        title: "Market Data Backend",
        href: "/market-data",
        icon: Database,
    },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center px-4">
                <div className="mr-4 hidden md:flex">
                    <Link href="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block">
                            AlgoTrading
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "transition-colors hover:text-foreground/80",
                                    pathname === item.href ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <item.icon className="h-4 w-4" />
                                    <span>{item.title}</span>
                                </div>
                            </Link>
                        ))}
                    </nav>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}
