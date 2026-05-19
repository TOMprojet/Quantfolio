'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Lock, AlertCircle, Plus, ArrowLeft, Trash2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ConfirmModal from './ConfirmModal';

interface IntegrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    integration: {
        title: string;
        imageSrc?: string;
        icon?: React.ElementType;
        color: string;
        type: 'api' | 'wallet' | 'sync';
        isFile?: boolean;
        formFields: { name: string; label: string; placeholder: string; type?: string; options?: { label: string; value: string }[] }[];
        imageClassName?: string;
    } | null;
}

const CustomDropdown = ({ label, placeholder, value, onChange, options }: any) => {
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

    const selectedOption = options?.find((opt: any) => opt.value === value);

    return (
        <div className="space-y-1.5 w-full relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full bg-foreground/10 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground flex items-center justify-between transition-all font-medium ${isOpen ? 'border-primary/50 bg-foreground/5' : 'hover:bg-foreground/5 shadow-sm'}`}
                >
                    <span className={selectedOption ? 'text-foreground' : 'text-foreground/40'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronRight size={14} className={`transition-transform duration-300 ${isOpen ? '-rotate-90' : 'rotate-90'} text-foreground/40`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-surface/90 backdrop-blur-2xl border border-foreground/10 rounded-xl shadow-2xl py-2 z-[70] overflow-hidden"
                        >
                            {options?.map((opt: any) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                        onChange({ target: { value: opt.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-2 text-sm font-medium text-left transition-all flex items-center justify-between ${value === opt.value ? 'bg-primary/20 text-primary' : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'}`}
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

const InputField = ({ label, placeholder, type = "text", value, onChange, options }: any) => {
    if (type === 'select') {
        return <CustomDropdown label={label} placeholder={placeholder} value={value} onChange={onChange} options={options} />;
    }

    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground/40 uppercase tracking-wider">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full bg-foreground/10 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 focus:bg-foreground/5 transition-all shadow-sm font-medium"
            />
        </div>
    );
};

export default function IntegrationModal({ isOpen, onClose, integration }: IntegrationModalProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [ppAccounts, setPpAccounts] = useState<{ label: string; value: string }[]>([]);
    const [selectedPpAccounts, setSelectedPpAccounts] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [view, setView] = useState<'list' | 'add'>('list');
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; index: number }>({
        isOpen: false,
        index: -1
    });
    const router = useRouter();

    useEffect(() => {
        if (file && integration?.title === 'Portfolio Performance') {
            analyzeFile(file);
        }
    }, [file]);

    const analyzeFile = async (selectedFile: File) => {
        setIsAnalyzing(true);
        setPpAccounts([]);
        setSelectedPpAccounts([]);
        try {
            // First, upload to temp/private to analyze
            const fd = new FormData();
            fd.append('file', selectedFile);
            fd.append('type', 'portfolio performance');
            fd.append('accountType', 'TEMP_ANALYSIS'); // Temporary name

            const uploadRes = await fetch('/api/integrations/csv', {
                method: 'POST',
                body: fd
            });
            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                // Now analyze
                const analysisRes = await fetch('/api/portfolio/analyze-pp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: uploadData.path.split(/[\\/]/).pop() })
                });
                const analysisData = await analysisRes.json();
                if (analysisData.accounts && analysisData.accounts.length > 0) {
                    setPpAccounts(analysisData.accounts.map((a: any) => ({
                        label: a.name,
                        value: a.name
                    })));
                } else if (analysisData.error) {
                    setErrorMessage(analysisData.error);
                } else {
                    setErrorMessage("Aucun compte (PEA, CTO ou Espèces) n'a été trouvé dans ce fichier XML.");
                }
            }
        } catch (e: any) {
            console.error('Analysis failed', e);
            setErrorMessage("L'analyse du fichier a échoué : " + (e.message || "Erreur inconnue"));
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        if (isOpen && integration) {
            fetchIntegrations();
        } else {
            // Reset state on close
            setAccounts([]);
            setPpAccounts([]);
            setSelectedPpAccounts([]);
            setView('list');
            setFormData({});
            setFile(null);
            setErrorMessage(null);
            setStatus('idle');
        }
    }, [isOpen, integration]);

    const fetchIntegrations = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/integrations');
            const json = await res.json();
            if (json.integrations && integration) {
                const type = integration.title.toLowerCase();
                const accs = json.integrations[type] || [];
                setAccounts(accs);
                // If no accounts, default to add view for better UX first time
                if (accs.length === 0) setView('add');
                else setView('list');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    if (!integration) return null;

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const togglePpAccount = (accountValue: string) => {
        setSelectedPpAccounts(prev =>
            prev.includes(accountValue)
                ? prev.filter(p => p !== accountValue)
                : [...prev, accountValue]
        );
    };

    const handleSave = async () => {
        setStatus('saving');
        try {
            // Handle File Upload if present
            let body: any;
            let headers: any = {};

            if (file) {
                const fd = new FormData();
                fd.append('type', integration.title.toLowerCase());
                Object.keys(formData).forEach(k => fd.append(k, formData[k]));

                // IMPORTANT: Add selectedAccounts for PP (Multi-select)
                if (ppAccounts.length > 0 && selectedPpAccounts.length > 0) {
                    fd.append('selectedAccounts', JSON.stringify(selectedPpAccounts));
                } else if (integration.title === 'Portfolio Performance' && ppAccounts.length > 0) {
                    throw new Error("Veuillez sélectionner au moins un compte.");
                }

                fd.append('file', file);
                body = fd;
                // No Content-Type header, let browser set it with boundary
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify({
                    type: integration.title.toLowerCase(),
                    data: formData
                });
            }

            const res = await fetch(integration.isFile ? '/api/integrations/csv' : '/api/integrations', {
                method: 'POST',
                headers,
                body
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }

            setStatus('success');
            setTimeout(() => {
                setStatus('idle');
                setFormData({});
                setFile(null);
                setSelectedPpAccounts([]);
                // Instead of closing, refresh list and go back to list view
                fetchIntegrations();
                router.refresh(); // Update dashboard data
            }, 1000);
        } catch (e: any) {
            setErrorMessage(e.message || 'Une erreur est survenue');
            setStatus('error');
            setTimeout(() => {
                setStatus('idle');
                setErrorMessage(null);
            }, 3000);
        }
    };

    const handleDelete = (index: number) => {
        setDeleteModal({ isOpen: true, index });
    };

    const confirmDelete = async () => {
        const index = deleteModal.index;
        // Close modal immediately for smooth UX
        setDeleteModal({ isOpen: false, index: -1 });

        try {
            const res = await fetch('/api/integrations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: integration!.title.toLowerCase(),
                    index
                })
            });
            if (res.ok) {
                fetchIntegrations();
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const isPP = integration.title === 'Portfolio Performance';

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
                        className="relative w-full max-w-lg bg-surface/90 border border-foreground/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between bg-white/5">
                            <div className="flex items-center gap-4">
                                {view === 'add' && accounts.length > 0 && (
                                    <button onClick={() => setView('list')} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors mr-2 text-slate-400">
                                        <ArrowLeft size={16} />
                                    </button>
                                )}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-foreground/5 border border-foreground/10 overflow-hidden`}>
                                    {integration.imageSrc ? (
                                        <img src={integration.imageSrc} alt={integration.title} className={`w-full h-full object-cover ${integration.imageClassName || ''}`} />
                                    ) : (
                                        integration.icon && <integration.icon size={24} className="text-foreground" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground tracking-tight">{integration.title}</h3>
                                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                                        {view === 'list'
                                            ? `${accounts.length} import${accounts.length > 1 ? 's' : ''} effectué${accounts.length > 1 ? 's' : ''}`
                                            : 'Ajouter un compte'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/10 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - LIST VIEW */}
                        {view === 'list' && (
                            <div className="p-6 space-y-4">
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-500" /></div>
                                ) : (
                                    <>
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                            {accounts.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500 text-xs font-bold uppercase tracking-widest">Aucun compte connecté</div>
                                            ) : (
                                                accounts.map((acc, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                                                <Check size={14} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-foreground">
                                                                    {acc.name || `Compte ${i + 1}`}
                                                                </span>
                                                                <span className="text-[10px] text-foreground/40 font-bold font-mono">
                                                                    {acc.address || acc.apiKey || 'Connecté'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDelete(i)}
                                                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500/20"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <button
                                            onClick={() => setView('add')}
                                            className="w-full py-4 rounded-xl border border-dashed border-foreground/10 text-foreground/40 hover:text-foreground hover:border-foreground/20 hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                                        >
                                            <Plus size={14} /> Ajouter un compte
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Body - ADD VIEW */}
                        {view === 'add' && (
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    {/* Hide generic fields for Portfolio Performance */}
                                    {!isPP && integration.formFields.map((field) => (
                                        <InputField
                                            key={field.name}
                                            label={field.label}
                                            placeholder={field.placeholder}
                                            type={field.type}
                                            value={formData[field.name] || ''}
                                            onChange={(e: any) => handleChange(field.name, e.target.value)}
                                            options={field.options}
                                        />
                                    ))}

                                    {integration.isFile && (
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    Fichier {integration.title === 'Interactive Brokers' ? 'CSV Import' : integration.title === 'Portfolio Performance' ? 'XML' : (integration.title === 'Bitget' ? 'CSV' : (file ? '✓ Sélectionné' : 'CSV'))}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept=".csv,.xml"
                                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                                        className="w-full bg-foreground/10 border border-foreground/10 rounded-xl px-4 py-2.5 text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-primary/20 file:text-[10px] file:font-bold file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:backdrop-blur-md file:transition-all file:cursor-pointer cursor-pointer shadow-sm"
                                                    />
                                                </div>
                                                {isAnalyzing && (
                                                    <div className="flex items-center gap-2 text-[10px] text-primary animate-pulse font-bold mt-1 uppercase tracking-widest">
                                                        <Loader2 size={10} className="animate-spin" /> Analyse des comptes en cours...
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-wider opacity-60">
                                                    {integration.title === 'Interactive Brokers'
                                                        ? "Exportez votre rapport Historique des Transactions (Transaction History) en format CSV depuis Interactive Brokers."
                                                        : integration.title === 'Portfolio Performance'
                                                            ? "Exportez votre portefeuille (XML) depuis l'application Portfolio Performance."
                                                            : integration.title === 'Bitget'
                                                                ? "Exportez l'historique de vos ordres (CSV) depuis Bitget."
                                                                : "Exportez votre historique d'opérations (CSV) depuis l'application."}
                                                </p>
                                            </div>

                                            {ppAccounts.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="space-y-3"
                                                >
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                        Comptes à importer
                                                    </label>
                                                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                        {ppAccounts.map((account) => (
                                                            <div
                                                                key={account.value}
                                                                onClick={() => togglePpAccount(account.value)}
                                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPpAccounts.includes(account.value)
                                                                    ? 'bg-primary/20 border-primary/50'
                                                                    : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                                                                    }`}
                                                            >
                                                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${selectedPpAccounts.includes(account.value)
                                                                    ? 'bg-primary border-primary text-white'
                                                                    : 'border-slate-600 bg-transparent'
                                                                    }`}>
                                                                    {selectedPpAccounts.includes(account.value) && <Check size={12} />}
                                                                </div>
                                                                <span className="text-sm text-white font-bold">{account.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
                                                        {selectedPpAccounts.length} compte{selectedPpAccounts.length > 1 ? 's' : ''} sélectionné{selectedPpAccounts.length > 1 ? 's' : ''}.
                                                    </p>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] flex items-start gap-4 shadow-sm">
                                    <Lock size={16} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold uppercase tracking-widest mb-1">Confidentialité garantie</p>
                                        <p className="font-bold opacity-60 uppercase tracking-tight">Vos données sont traitées localement et via des APIs publiques sécurisées.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={status === 'saving' || status === 'success'}
                                        className={`flex-1 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg backdrop-blur-md border
                                            ${status === 'success'
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                : status === 'error'
                                                    ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                                    : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:scale-[1.01] active:scale-[0.98] shadow-primary/10'}
                                        `}
                                    >
                                        {status === 'saving' && <Loader2 size={16} className="animate-spin" />}
                                        {status === 'success' && <Check size={16} />}
                                        {status === 'error' && <AlertCircle size={16} />}

                                        {status === 'idle' && 'Connecter'}
                                        {status === 'saving' && 'Vérification...'}
                                        {status === 'success' && 'Connecté !'}
                                        {status === 'error' && (errorMessage || 'Erreur')}
                                    </button>
                                </div>
                                {errorMessage && (
                                    <div className="mt-2 text-red-400 text-[10px] text-center border border-red-500/20 bg-red-500/10 p-3 rounded-xl font-bold uppercase tracking-widest">
                                        {errorMessage}
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Supprimer la connexion"
                message="Êtes-vous sûr de vouloir supprimer ce compte ? Cette action supprimera également les données associées."
                confirmLabel="Supprimer"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, index: -1 })}
                isDanger={true}
            />
        </AnimatePresence>
    );
}
