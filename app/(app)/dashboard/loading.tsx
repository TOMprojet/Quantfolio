import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardLoading() {
    return (
        <div className="h-full w-full overflow-hidden bg-background text-foreground">
            <div className="p-8 lg:p-12 space-y-12">
                {/* Header Skeleton (matching PageHeader) */}
                <div className="flex items-center gap-6 pb-8 border-b border-foreground/5">
                    <Skeleton className="w-16 h-16 rounded-[2rem]" />
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>

                {/* KPI GRID Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-32 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    ))}
                </div>

                {/* MAIN CONTENT GRID Skeleton */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* CAPITAL EVOLUTION (Left - 8 cols) */}
                    <div className="xl:col-span-8">
                        <Skeleton className="h-[400px] rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    </div>

                    {/* UNIFIED ALLOCATION (Right - 4 cols) */}
                    <div className="xl:col-span-4">
                        <Skeleton className="h-[400px] rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    </div>
                </div>

                {/* PERFORMERS SECTION Skeleton */}
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Skeleton className="h-64 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                        <Skeleton className="h-64 rounded-[2rem] border border-foreground/5 shadow-2xl bg-foreground/[0.02]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
