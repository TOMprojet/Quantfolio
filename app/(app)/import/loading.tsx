import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Download } from 'lucide-react';

export default function ImportLoading() {
    return (
        <div className="h-full w-full overflow-hidden bg-background text-foreground">
            <div className="p-8 lg:p-12 space-y-12">
                
                {/* Header Skeleton (matching PageHeader) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-foreground/5 gap-6">
                    <div className="flex items-center gap-6">
                        <Skeleton className="w-16 h-16 rounded-[2rem]" />
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-64" />
                            <Skeleton className="h-4 w-80" />
                        </div>
                    </div>
                </div>

                {/* Manual Import Button Skeleton */}
                <div className="flex justify-center py-4">
                    <Skeleton className="w-full max-w-2xl h-16 rounded-2xl border border-foreground/5 bg-foreground/[0.02]" />
                </div>

                {/* Sections Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* STOCKS SECTION */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <Skeleton className="h-7 w-40" />
                        </div>
                        <div className="grid gap-4">
                            <Skeleton className="h-32 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-xl" />
                            <Skeleton className="h-32 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-xl" />
                        </div>
                    </div>

                    {/* CRYPTO SECTION */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <Skeleton className="h-7 w-40" />
                        </div>
                        <div className="grid gap-4">
                            <Skeleton className="h-32 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-xl" />
                            <Skeleton className="h-32 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-xl" />
                            <Skeleton className="h-32 rounded-2xl border border-foreground/5 bg-foreground/[0.02] shadow-xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
