'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity } from 'lucide-react';

interface PerformanceMoversProps {
    currentHoldings: any[];
}

export default function PerformanceMovers({ currentHoldings }: PerformanceMoversProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TOP PERFORMERS */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-black/20 border border-white/5 shadow-sm rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white mb-4">
                    <TrendingUp size={18} className="text-emerald-400" /> Top Performers
                </h3>
                <div className="space-y-3">
                    {[...currentHoldings].sort((a, b) => b.performance - a.performance).slice(0, 3).map((h, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-white text-sm">{h.name}</div>
                            </div>
                            <div className={`font-bold ${h.performance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {h.performance > 0 ? '+' : ''}{h.performance?.toFixed(2)}%
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* FLOP PERFORMERS */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="bg-black/20 border border-white/5 shadow-sm rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white mb-4">
                    <Activity size={18} className="text-red-400" /> Moins Bonnes Perf.
                </h3>
                <div className="space-y-3">
                    {[...currentHoldings].sort((a, b) => a.performance - b.performance).slice(0, 3).map((h, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="font-bold text-white text-sm">{h.name}</div>
                            </div>
                            <div className={`font-bold ${h.performance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {h.performance > 0 ? '+' : ''}{h.performance?.toFixed(2)}%
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
