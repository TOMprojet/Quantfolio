'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subValue?: string | number;
    subValueColor?: string;
    icon: LucideIcon;
    color: 'blue' | 'purple' | 'emerald' | 'indigo' | 'orange' | 'pink' | 'rose' | 'amber';
    delay?: number;
    useColorForValue?: boolean;
}

const colorMap = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', glow: 'bg-blue-500/5', hoverGlow: 'group-hover:bg-blue-500/10' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', glow: 'bg-purple-500/5', hoverGlow: 'group-hover:bg-purple-500/10' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'bg-emerald-500/5', hoverGlow: 'group-hover:bg-emerald-500/10' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'bg-indigo-500/5', hoverGlow: 'group-hover:bg-indigo-500/10' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'bg-orange-500/5', hoverGlow: 'group-hover:bg-orange-500/10' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', glow: 'bg-pink-500/5', hoverGlow: 'group-hover:bg-pink-500/10' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', glow: 'bg-rose-500/5', hoverGlow: 'group-hover:bg-rose-500/10' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'bg-amber-500/5', hoverGlow: 'group-hover:bg-amber-500/10' },
};

export function StatCard({ title, value, subValue, subValueColor, icon: Icon, color, delay = 0, useColorForValue = false }: StatCardProps) {
    const theme = colorMap[color];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay }} 
            className="glass-card rounded-3xl p-6 relative overflow-hidden group h-full transition-all duration-500 hover:border-primary/30"
        >
            <div className={`absolute top-0 right-0 w-40 h-40 ${theme.glow} rounded-full blur-[80px] -mr-20 -mt-20 transition-all duration-700 ${theme.hoverGlow}`}></div>
            <div className="flex items-start justify-between relative z-10 gap-3 sm:gap-4">
                <div className="flex flex-col gap-1 sm:gap-1.5 min-w-0 flex-1">
                    <h3 className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] lg:tracking-[0.25em] mb-0.5 sm:mb-1">{title}</h3>
                    <h3 className={`text-lg sm:text-xl lg:text-xl xl:text-2xl 2xl:text-3xl font-bold tracking-tight whitespace-nowrap leading-tight ${useColorForValue ? theme.text : 'text-foreground'}`}>{value}</h3>
                    {subValue && (
                        <div className={`text-[10px] sm:text-xs font-bold w-fit px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg mt-0.5 sm:mt-1 ${subValueColor || 'bg-foreground/5 text-slate-600 dark:text-slate-400'} leading-none`}>
                            {subValue}
                        </div>
                    )}
                </div>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${theme.bg} flex items-center justify-center ${theme.text} shrink-0 border border-foreground/5 shadow-inner`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
            </div>
        </motion.div>
    );
}
