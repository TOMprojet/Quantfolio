import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Settings2 } from 'lucide-react';

export default function SettingsLoading() {
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

                {/* Settings Grid Content */}
                <div className="max-w-4xl space-y-10">
                    {/* Section 1 */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <Skeleton className="h-7 w-56" />
                        </div>
                        <div className="grid gap-6 pl-11">
                            <Skeleton className="h-14 w-full rounded-2xl border border-foreground/5 bg-foreground/[0.02]" />
                            <Skeleton className="h-14 w-full rounded-2xl border border-foreground/5 bg-foreground/[0.02]" />
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <Skeleton className="h-7 w-48" />
                        </div>
                        <div className="grid gap-6 pl-11">
                            <Skeleton className="h-14 w-full rounded-2xl border border-foreground/5 bg-foreground/[0.02]" />
                            <Skeleton className="h-24 w-full rounded-2xl border border-foreground/5 bg-foreground/[0.02]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
