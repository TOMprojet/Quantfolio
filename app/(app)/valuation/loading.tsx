import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Calculator } from 'lucide-react';

export default function ValuationLoading() {
    return (
        <div className="h-full w-full overflow-hidden bg-background flex text-foreground">
            {/* Sidebar Skeleton (Right side of left rail) */}
            <div className="w-80 border-r border-foreground/5 bg-foreground/[0.02] p-8 flex flex-col gap-6">
                <Skeleton className="h-8 w-48 mb-4 rounded-xl" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-2xl border border-foreground/5" />
                    ))}
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 p-8 lg:p-12 space-y-12 overflow-y-auto">
                {/* Header Skeleton (matching PageHeader) */}
                <div className="flex items-center gap-6 pb-8 border-b border-foreground/5">
                    <Skeleton className="w-16 h-16 rounded-[2rem]" />
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-80" />
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    ))}
                </div>

                {/* Main chart */}
                <Skeleton className="h-[400px] w-full rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />

                {/* DCF Config / Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-64 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    <Skeleton className="h-64 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                </div>
            </div>
        </div>
    );
}
