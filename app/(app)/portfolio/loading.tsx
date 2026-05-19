import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Wallet } from 'lucide-react';

export default function PortfolioLoading() {
    return (
        <div className="h-full w-full overflow-hidden bg-background text-foreground">
            <div className="p-8 lg:p-12 space-y-12">
                
                {/* Header Skeleton (matching PageHeader) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-foreground/5 gap-6">
                    <div className="flex items-center gap-6">
                        <Skeleton className="w-16 h-16 rounded-[2rem]" />
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    {/* Buttons skeleton */}
                    <div className="flex bg-foreground/5 p-1.5 rounded-xl border border-foreground/5 gap-1">
                        <Skeleton className="w-16 h-8 rounded-xl" />
                        <Skeleton className="w-24 h-8 rounded-xl" />
                        <Skeleton className="w-20 h-8 rounded-xl" />
                    </div>
                </div>

                {/* MAIN CONTENT GRID Skeleton */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* PERFORMANCE CHART (8 cols) */}
                    <div className="xl:col-span-8">
                        <Skeleton className="h-[450px] rounded-[2rem] border border-foreground/5 shadow-2xl" />
                    </div>

                    {/* ALLOCATION (4 cols) */}
                    <div className="xl:col-span-4">
                        <Skeleton className="h-[450px] rounded-[2rem] border border-foreground/5 shadow-2xl" />
                    </div>
                </div>

                {/* ASSETS TABLE Skeleton */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-6 h-6 rounded-full" />
                        <Skeleton className="h-7 w-40" />
                    </div>

                    <div className="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] overflow-hidden shadow-2xl backdrop-blur-sm">
                        <div className="h-14 border-b border-foreground/5 flex items-center px-8 gap-4">
                            <Skeleton className="h-4 w-1/4" />
                            <div className="flex-1 flex justify-end gap-10">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>

                        <div className="divide-y divide-foreground/5">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="px-8 py-6 flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-2xl" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <Skeleton className="h-6 w-24" />
                                    <Skeleton className="h-6 w-32" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
