'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: React.ReactNode;
    subtitle: string;
    icon: LucideIcon;
    rightContent?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, icon: Icon, rightContent }: PageHeaderProps) {
    return (
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-8 border-b border-foreground/5 gap-6 sm:gap-8">
            <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-glow relative overflow-hidden group shrink-0">
                    <div className="absolute inset-0 bg-primary/5 group-hover:scale-110 transition-transform duration-500" />
                    <Icon className="text-primary relative z-10 w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight truncate sm:whitespace-normal">{title}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-medium text-xs sm:text-sm line-clamp-1 sm:line-clamp-none">{subtitle}</p>
                </div>
            </div>
            
            {rightContent && (
                <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                    {rightContent}
                </div>
            )}
        </header>
    );
}
