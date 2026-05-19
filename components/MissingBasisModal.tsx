'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';

interface MissingBasisModalProps {
    isOpen: boolean;
    onClose: () => void;
    missingAssets: { symbol: string, quantity: number, isStablecoin: boolean }[];
    onSave: (updates: Record<string, { date: string, price: number }>) => Promise<void>;
}

export default function MissingBasisModal({ isOpen, onClose, missingAssets, onSave }: MissingBasisModalProps) {
    const [updates, setUpdates] = useState<Record<string, { date: string, price: number }>>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleUpdate = (symbol: string, field: 'date' | 'price', value: string | number) => {
        setUpdates(prev => ({
            ...prev,
            [symbol]: {
                ...(prev[symbol] || { date: '2024-01-01', price: 0 }), // Default date
                [field]: value
            }
        }));
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        await onSave(updates);
        setIsSaving(false);
        onClose();
    };

    if (!missingAssets || missingAssets.length === 0) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[#151923] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <AlertCircle className="text-orange-400" size={20} />
                                    Prix de Revient Manquant
                                </h3>
                                <p className="text-sm text-slate-400 mt-1">
                                    Certains actifs n'ont pas d'historique d'achat. Veuillez indiquer leur PRU estimé.
                                </p>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {missingAssets.map((asset) => (
                                <div key={asset.symbol} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white text-lg">{asset.symbol}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                                Qté: {asset.quantity}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Date Achat (Est.)</label>
                                            <input
                                                type="date"
                                                className="w-32 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                                onChange={(e) => handleUpdate(asset.symbol, 'date', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Prix Unitaire</label>
                                            <input
                                                type="number"
                                                step="any"
                                                placeholder="0.00"
                                                className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                                onChange={(e) => handleUpdate(asset.symbol, 'price', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
                            <button onClick={onClose} className="px-6 py-2 rounded-xl text-slate-400 font-bold text-sm hover:bg-white/5 transition-colors">
                                Ignorer
                            </button>
                            <button
                                onClick={handleSaveClick}
                                disabled={isSaving}
                                className="px-6 py-2 rounded-xl bg-primary hover:bg-primary/80 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? 'Enregistrement...' : <><Save size={16} /> Enregistrer</>}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
