'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import PageHeader from './ui/PageHeader';

interface PlaceholderProps {
    title: string;
    icon: LucideIcon;
    message: string;
}

export default function PlaceholderView({ title, icon: Icon, message }: PlaceholderProps) {
    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground">
            <div className="p-8 lg:p-12 space-y-12">
                <PageHeader
                    title={title}
                    subtitle="Cette fonctionnalité est en cours de développement."
                    icon={Icon}
                />
                
                <div className="flex items-center justify-center pt-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center p-12 glass-card rounded-3xl border border-white/5 bg-white/[0.02] w-full max-w-2xl"
                    >
                        <div className="p-6 bg-primary/10 rounded-full text-primary mb-6 shadow-glow border border-primary/20">
                            <Icon size={48} />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{title}</h2>
                        <p className="text-slate-400 text-center max-w-md font-medium leading-relaxed">
                            {message}
                        </p>
                        <div className="mt-10 flex gap-4">
                            <div className="w-24 h-1 bg-primary/30 rounded-full"></div>
                            <div className="w-8 h-1 bg-primary/30 rounded-full"></div>
                            <div className="w-4 h-1 bg-primary/30 rounded-full"></div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
