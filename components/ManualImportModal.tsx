'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Calendar, Hash, Euro, Search, AlertCircle, ChevronRight, Download, TrendingUp, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}

function getExchangeName(exch: string) {
    if (exch === 'PAR') return 'Euronext Paris';
    if (exch === 'NMS') return 'NASDAQ';
    if (exch === 'NYQ') return 'NYSE';
    if (exch === 'FRA') return 'Frankfurt';
    return exch || 'Bourse Internationale';
}

interface ManualImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CustomDropdown = ({ label, placeholder, value, onChange, options, icon: Icon }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt: any) => opt.value === value);

    return (
        <div className={`space-y-1.5 w-full relative ${isOpen ? 'z-[999]' : 'z-10'}`} ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-foreground/5 backdrop-blur-xl border border-foreground/5 rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-4 text-sm text-foreground flex items-center justify-between transition-all font-bold shadow-inner ${isOpen ? 'border-primary/40 bg-foreground/10' : 'hover:bg-foreground/10 hover:border-foreground/10'}`}
                >
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none">
                                <Icon size={16} />
                            </div>
                        )}
                        <span className={selectedOption ? 'text-foreground' : 'text-foreground/40'}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'} text-foreground/40`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-surface backdrop-blur-2xl border border-foreground/10 rounded-2xl shadow-2xl py-2 z-[70] overflow-hidden"
                        >
                            {options.map((opt: any) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange({ target: { value: opt.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-5 py-3 text-sm font-bold text-left transition-all flex items-center justify-between ${value === opt.value ? 'bg-primary/20 text-primary' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'}`}
                                >
                                    {opt.label}
                                    {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const InputField = ({ label, placeholder, type = "text", value, onChange, icon: Icon, options, hideArrows }: any) => {
    if (type === 'select') {
        return <CustomDropdown label={label} placeholder={placeholder} value={value} onChange={onChange} options={options} icon={Icon} />;
    }

    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors pointer-events-none">
                        <Icon size={16} />
                    </div>
                )}
                <div className="relative">
                    <input
                        type={type}
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                        className={`w-full bg-foreground/5 backdrop-blur-xl border border-foreground/5 rounded-2xl ${Icon ? 'pl-11' : 'px-5'} py-4 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-primary/40 focus:bg-foreground/10 transition-all font-bold shadow-inner ${hideArrows ? 'appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default function ManualImportModal({ isOpen, onClose }: ManualImportModalProps) {
    const [transactionType, setTransactionType] = useState<'BUY' | 'SELL' | 'DEPOSIT' | 'DIVIDEND'>('BUY');
    const [assetType, setAssetType] = useState('STOCK');
    const [source, setSource] = useState('Portfolio Performance');
    const [ticker, setTicker] = useState('');
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isTickerValid, setIsTickerValid] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [availableSources, setAvailableSources] = useState<{label: string, value: string}[]>([]);

    const router = useRouter();

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setTransactionType('BUY');
            setAssetType('STOCK');
            setTicker('');
            setName('');
            setQuery('');
            setResults([]);
            setQuantity('');
            setPrice('');
            setStatus('idle');
            setError(null);
            setIsTickerValid(null);
        } else {
            // Fetch actual sources from master store
            fetch('/api/integrations/sources')
                .then(res => res.json())
                .then(data => {
                    if (data.sources) {
                        const platforms = data.sources.map((src: string) => {
                            let label = src;
                            let value = src;
                            
                            // Make labels prettier
                            if (src === 'IBKR' || src === 'Interactive Brokers') label = 'Interactive Brokers';
                            else if (src.includes('PP:') || src === 'Portfolio Performance') label = 'Portfolio Performance';
                            else if (src === 'Manual Import') label = 'Manuel';
                            else label = src;

                            return { label, value };
                        });
                        
                        // Remove duplicates by value
                        const unique = Array.from(new Map(platforms.map((item: any) => [item.value, item])).values());
                        setAvailableSources(unique as any);
                        
                        if (unique.length > 0) {
                            setSource((unique[0] as any).value);
                        }
                    }
                })
                .catch(() => {
                    setAvailableSources([]);
                });
        }
    }, [isOpen]);

    // Auto-detect / Search
    useEffect(() => {
        if (query.length >= 2 && transactionType !== 'DEPOSIT') {
            setIsSearching(true);
            const timer = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/search?q=${query}`);
                    if (res.ok) {
                        const data = await res.json();
                        setResults(Array.isArray(data) ? data : data.results || []);
                    } else {
                        setResults([]);
                    }
                } catch (e) {
                    console.error("Failed to fetch search results", e);
                    setResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setResults([]);
            setIsSearching(false);
        }
    }, [query, transactionType]);

    const handleSelectAsset = (r: SearchResult) => {
        setTicker(r.symbol);
        setName(r.name);
        setQuery(r.symbol);
        setResults([]);
        setIsTickerValid(true);
    };

    // If user modifies query after selection, invalidate
    useEffect(() => {
        if (query !== ticker) {
            setIsTickerValid(null);
            setTicker('');
            setName('');
        }
    }, [query]);

    const handleSave = async () => {
        // Validation logic
        if (transactionType === 'DEPOSIT') {
            if (!price || !date) {
                setError("Veuillez remplir le montant et la date.");
                return;
            }
        } else {
            if (!ticker || !price || !date || (transactionType !== 'DIVIDEND' && !quantity)) {
                setError("Veuillez remplir tous les champs obligatoires.");
                return;
            }
            // Strict ticker validation
            if (isTickerValid === false) {
                setError("Ticker invalide. Veuillez sélectionner un actif reconnu.");
                return;
            }
        }

        setStatus('saving');
        setError(null);

        try {
            const res = await fetch('/api/integrations/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionType,
                    assetType,
                    source,
                    ticker: transactionType === 'DEPOSIT' ? 'CASH' : ticker.toUpperCase(),
                    name,
                    date,
                    quantity: quantity ? parseFloat(quantity) : 0,
                    price: parseFloat(price)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "L'enregistrement a échoué");
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
                router.refresh();
            }, 1000);
        } catch (e: any) {
            setError(e.message);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/70 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-xl bg-surface/90 border border-foreground/10 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-3xl"
                    >
                        {/* Glow Decorations */}
                        <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none opacity-40 animate-pulse" />
                        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none opacity-40" />

                        {/* Top Accent Line */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                        <div className="relative p-10">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-10">
                                <div className="flex items-center gap-5">
                                    <div>
                                        <h3 className="text-2xl font-bold text-foreground uppercase tracking-tighter leading-none mb-2">Position Manuelle</h3>
                                        <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest opacity-70">
                                            {transactionType === 'DEPOSIT' ? 'Gérer les liquidités' : (transactionType === 'DIVIDEND' ? 'Enregistrer un dividende' : 'Ajouter un actif financier')}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-foreground/5 border border-foreground/5 flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/10 hover:border-foreground/10 transition-all group">
                                    <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Operation Type Selector */}
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField
                                        label="Type d'opération"
                                        type="select"
                                        placeholder="Choisir..."
                                        value={transactionType}
                                        onChange={(e: any) => {
                                            const newType = e.target.value;
                                            setTransactionType(newType);
                                            if (newType === 'DIVIDEND') {
                                                setAssetType('STOCK');
                                            }
                                        }}
                                        options={[
                                            { label: 'Achat', value: 'BUY' },
                                            { label: 'Vente', value: 'SELL' },
                                            { label: 'Dépôt', value: 'DEPOSIT' },
                                            { label: 'Dividende', value: 'DIVIDEND' }
                                        ]}
                                    />

                                    {transactionType !== 'DEPOSIT' ? (
                                        <InputField
                                            label="Type d'actif"
                                            type="select"
                                            placeholder="Choisir..."
                                            value={assetType}
                                            onChange={(e: any) => setAssetType(e.target.value)}
                                            options={transactionType === 'DIVIDEND'
                                                ? [{ label: 'Stock / ETF', value: 'STOCK' }]
                                                : [
                                                    { label: 'Stock / ETF', value: 'STOCK' },
                                                    { label: 'Crypto', value: 'CRYPTO' }
                                                ]
                                            }
                                        />
                                    ) : (
                                        <InputField
                                            label="Compte Source"
                                            type="select"
                                            placeholder="Chargement..."
                                            value={source}
                                            onChange={(e: any) => setSource(e.target.value)}
                                            icon={Building2}
                                            options={availableSources}
                                        />
                                    )}
                                </div>
                                
                                {transactionType !== 'DEPOSIT' && (
                                    <InputField
                                        label="Compte Source"
                                        type="select"
                                        placeholder="Chargement..."
                                        value={source}
                                        onChange={(e: any) => setSource(e.target.value)}
                                        icon={Building2}
                                        options={availableSources}
                                    />
                                )}

                                {transactionType !== 'DEPOSIT' && (
                                    <div className="space-y-1.5 relative z-[100]">
                                        <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest ml-1">Rechercher Symbole / Entreprise</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-all pointer-events-none">
                                                <Search size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="AAPL, BTC, CW8..."
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                className={`w-full bg-foreground/5 backdrop-blur-xl border rounded-2xl pl-12 pr-5 py-4 text-sm text-foreground placeholder:text-foreground/20 focus:outline-none focus:bg-foreground/10 transition-all font-bold uppercase shadow-inner ${isTickerValid === false && query.length >= 2 && results.length === 0 && !isSearching
                                                    ? 'border-red-500/50 focus:border-red-500'
                                                    : isTickerValid === true
                                                        ? 'border-emerald-500/50 focus:border-emerald-500/50'
                                                        : 'border-foreground/5 focus:border-primary/40'
                                                    }`}
                                            />
                                            {isSearching && (
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                    <Loader2 size={16} className="animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Dropdown Results */}
                                        <AnimatePresence>
                                            {results.length > 0 && !isTickerValid && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-surface/95 border border-foreground/10 rounded-2xl shadow-2xl z-[999] p-2 backdrop-blur-3xl overflow-hidden flex flex-col"
                                                >
                                                    <div className="max-h-[250px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                                        <div className="flex flex-col gap-1">
                                                            {results.map((r) => (
                                                                <button 
                                                                    key={r.symbol}
                                                                    onClick={() => handleSelectAsset(r)}
                                                                    className="w-full flex items-center justify-between p-3 hover:bg-foreground/5 rounded-xl transition-all group/item shrink-0 text-left"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center border border-foreground/5 group-hover:border-primary/30 transition-all shrink-0 overflow-hidden relative">
                                                                            {r.logoUrl ? (
                                                                                <img 
                                                                                    src={r.logoUrl} 
                                                                                    alt={r.symbol} 
                                                                                    className="w-full h-full object-cover"
                                                                                    onError={(e) => {
                                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                                        (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <TrendingUp className="w-4 h-4 text-slate-500 opacity-40 group-hover/item:text-primary group-hover/item:opacity-100 transition-all" />
                                                                            )}
                                                                            <TrendingUp className="w-4 h-4 text-slate-500 opacity-40 group-hover/item:text-primary group-hover/item:opacity-100 transition-all absolute inset-0 m-auto hidden [.fallback-icon_&]:block" />
                                                                        </div>
                                                                        <div className="flex flex-col items-start min-w-0">
                                                                            <span className="font-bold text-foreground text-sm group-hover/item:text-primary transition-colors truncate">
                                                                                {r.symbol}
                                                                            </span>
                                                                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest truncate max-w-[200px]">
                                                                                {r.name}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="px-2 py-1 bg-foreground/5 rounded-lg text-[8px] font-bold text-foreground/40 uppercase">
                                                                            {getExchangeName(r.exchange)}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {transactionType !== 'DEPOSIT' && (
                                    <>
                                        {isTickerValid === true && name && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-4 bg-gradient-to-r from-emerald-500/10 to-transparent border-l-2 border-emerald-500 rounded-r-2xl flex items-center gap-4 shadow-lg shadow-black/20"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                    <Check size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-0.5">Actif Identifié</div>
                                                    <div className="text-sm font-bold text-foreground">{name}</div>
                                                </div>
                                            </motion.div>
                                        )}
                                        {/* Error message hidden as per user request */}
                                    </>
                                )}

                                <div className={`grid ${transactionType === 'DEPOSIT' || transactionType === 'DIVIDEND' ? 'grid-cols-1' : 'grid-cols-2'} gap-5`}>
                                    {transactionType !== 'DEPOSIT' && transactionType !== 'DIVIDEND' && (
                                        <InputField
                                            label="Quantité"
                                            type="number"
                                            placeholder="0.00"
                                            icon={Hash}
                                            value={quantity}
                                            onChange={(e: any) => setQuantity(e.target.value)}
                                            hideArrows
                                        />
                                    )}
                                    <InputField
                                        label={transactionType === 'DEPOSIT' ? "Somme déposée (EUR)" : (transactionType === 'DIVIDEND' ? "Montant Net (EUR)" : "Prix par unité (EUR)")}
                                        type="number"
                                        placeholder="0.00"
                                        icon={Euro}
                                        value={price}
                                        onChange={(e: any) => setPrice(e.target.value)}
                                        hideArrows
                                    />
                                </div>

                                <InputField
                                    label="Date Effective"
                                    type="date"
                                    icon={Calendar}
                                    value={date}
                                    onChange={(e: any) => setDate(e.target.value)}
                                />

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-3"
                                    >
                                        <AlertCircle size={18} />
                                        {error}
                                    </motion.div>
                                )}

                                <div className="pt-6">
                                    <button
                                        onClick={handleSave}
                                        disabled={status === 'saving' || status === 'success' || (transactionType !== 'DEPOSIT' && transactionType !== 'DIVIDEND' && isTickerValid === false)}
                                        className={`w-full py-5 rounded-[1.5rem] text-sm font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 overflow-hidden relative group border
                                            ${status === 'success'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                                                : status === 'error'
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                                    : (transactionType !== 'DEPOSIT' && transactionType !== 'DIVIDEND' && isTickerValid === false)
                                                        ? 'bg-foreground/5 border-foreground/5 text-foreground/30 cursor-not-allowed'
                                                        : 'bg-primary/10 backdrop-blur-md text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] hover:scale-[1.01] active:scale-[0.98]'}
                                        `}
                                    >
                                        {/* Violet Blur Shine Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                        {status === 'saving' ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin text-primary" />
                                                <span className="text-primary/70 font-bold">SYNCHRONISATION...</span>
                                            </>
                                        ) : status === 'success' ? (
                                            <>
                                                <Check size={20} className="animate-bounce" />
                                                POSITION VALIDÉE
                                            </>
                                        ) : (
                                            <>
                                                <Download size={18} className="group-hover:-translate-y-1 transition-transform" />
                                                AJOUTER AU PORTEFEUILLE
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
