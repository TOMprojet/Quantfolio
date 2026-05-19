import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileText } from 'lucide-react';

export default function WatchlistLoading() {
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
                </div>

                {/* KPI Overview Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] shadow-2xl" />
                    ))}
                </div>

                {/* TABLE Skeleton */}
                <div className="rounded-[2rem] border border-foreground/5 bg-foreground/[0.02] overflow-hidden shadow-2xl backdrop-blur-sm">
                    {/* Headers */}
                    <div className="h-14 border-b border-foreground/5 bg-foreground/[0.02] flex items-center px-8 gap-4">
                        <Skeleton className="h-4 w-1/4" />
                        <div className="flex-1 flex justify-end gap-12">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>

                    {/* Content Rows */}
                    <div className="divide-y divide-foreground/5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="px-8 py-6 flex items-center gap-4">
                                <Skeleton className="w-12 h-12 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <div className="flex gap-12">
                                    <Skeleton className="h-7 w-24 rounded-lg" />
                                    <Skeleton className="h-7 w-32 rounded-lg" />
                                    <Skeleton className="h-7 w-24 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
