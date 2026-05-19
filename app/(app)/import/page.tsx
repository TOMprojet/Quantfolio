'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Smartphone, Globe, BarChart3, Plus, Download, ChevronRight } from 'lucide-react';
import IntegrationModal from '@/components/IntegrationModal';
import ManualImportModal from '../../../components/ManualImportModal';
import PageHeader from '../../../components/ui/PageHeader';

// Custom reusable Input component for the dark theme


// Integration Card Component
interface integrationCardProps {
    title: string;
    subtitle: string;
    imageSrc?: string;
    icon?: React.ElementType;
    color: string;
    recommended?: boolean;
    type: 'api' | 'wallet' | 'sync';
    formFields: { name: string; label: string; placeholder: string; type?: string }[];
    onConnect: () => void;
    imageClassName?: string;
}

const IntegrationCard = ({ title, subtitle, icon: Icon, imageSrc, color, recommended, onConnect, imageClassName }: integrationCardProps) => {
    // Color maps for dynamic styling
    // User requested "darker violet" for everything.
    const colorClasses: Record<string, any> = {
        // We redefine 'purple' to be the primary violet used elsewhere
        purple: {
            bg: 'bg-[#6D28D9]/10', // Violet-700/10 equivalent or custom
            text: 'text-[#8B5CF6]', // Violet-500
            border: 'border-[#8B5CF6]/20',
            hover: 'group-hover:text-[#A78BFA]', // Violet-400
            glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]' // Violet glow
        },
        // Legacy fallbacks mapped to purple for safety if needed, or kept for reference
        emerald: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', hover: 'group-hover:text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]' },
        orange: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', hover: 'group-hover:text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]' },
        cyan: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/20', hover: 'group-hover:text-violet-400', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]' },
    };
    const c = colorClasses[color] || colorClasses.purple;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-foreground/[0.02] backdrop-blur-sm rounded-2xl border border-foreground/5 overflow-hidden transition-all duration-300 hover:border-foreground/10 group shadow-xl`}
        >
            <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.text} ${c.border} border overflow-hidden`}>
                        {imageSrc ? (
                            <img src={imageSrc} alt={title} className={`w-full h-full object-cover ${imageClassName || ''}`} />
                        ) : (
                            Icon && <Icon size={24} />
                        )}
                    </div>
                    <div>
                        <h3 className={`text-base font-bold text-foreground transition-colors ${c.hover}`}>{title}</h3>
                        <p className={`text-xs font-medium ${subtitle.includes('connecté') || subtitle.includes('effectué') ? 'text-emerald-500 font-bold flex items-center gap-1' : 'text-foreground/60'}`}>
                            {(subtitle.includes('connecté') || subtitle.includes('effectué')) && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
                            {subtitle}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {recommended && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                            Recommandé
                        </span>
                    )}
                    <button
                        onClick={onConnect}
                        className="px-4 py-2 rounded-xl bg-foreground/5 border border-foreground/5 hover:bg-foreground/10 hover:border-foreground/10 text-xs font-bold text-foreground transition-all flex items-center gap-2"
                    >
                        CONNECTER <ChevronRight size={14} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default function ImportPage() {
    const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
    const [isManualModalOpen, setManualModalOpen] = useState(false);
    const [integrationCounts, setIntegrationCounts] = useState<Record<string, number>>({});

    React.useEffect(() => {
        // Fetch valid integration counts
        fetch('/api/integrations')
            .then(res => res.json())
            .then(data => {
                if (data.integrations) {
                    const counts: any = {};
                    Object.entries(data.integrations).forEach(([key, val]: [string, any]) => {
                        counts[key] = Array.isArray(val) ? val.length : (val ? 1 : 0);
                    });
                    setIntegrationCounts(counts);
                }
            })
            .catch(e => console.error(e));
    }, [selectedIntegration]); // Refresh when modal closes (selectedIntegration becomes null/changed)

    const openModal = (integration: any) => setSelectedIntegration(integration);
    const closeModal = () => setSelectedIntegration(null);

    const getCount = (type: string) => integrationCounts[type.toLowerCase()] || 0;

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground">
            <div className="p-4 sm:p-8 lg:p-10 space-y-8 sm:space-y-12 relative">
                <IntegrationModal isOpen={!!selectedIntegration} onClose={closeModal} integration={selectedIntegration} />
                <ManualImportModal isOpen={isManualModalOpen} onClose={() => setManualModalOpen(false)} />

                <PageHeader
                    title="Import Portfolio"
                    subtitle="Connectez vos courtiers et portefeuilles crypto pour synchroniser vos actifs en temps réel."
                    icon={Download}
                />

            {/* Centered Manual Import Button */}
            <div className="flex justify-center py-4">
                <button
                    onClick={() => setManualModalOpen(true)}
                    className="w-full max-w-2xl py-5 bg-primary/10 backdrop-blur-md border border-primary/20 hover:border-primary/40 rounded-2xl text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-3 text-base font-bold group shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:shadow-[0_0_40px_rgba(139,92,246,0.2)] hover:scale-[1.01] active:scale-[0.99]"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                    AJOUTER UNE POSITION MANUELLE
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* STOCKS SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500">
                            <BarChart3 size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Bourse & ETF</h2>
                    </div>

                    <div className="grid gap-4">
                        <IntegrationCard
                            title="Interactive Brokers"
                            subtitle={getCount('interactive brokers') > 0 ? `${getCount('interactive brokers')} import${getCount('interactive brokers') > 1 ? 's' : ''} effectué${getCount('interactive brokers') > 1 ? 's' : ''}` : "Import CSV"}
                            imageSrc="/logo/IBKR.png"
                            color="purple"
                            type="api"
                            recommended
                            formFields={[]}
                            onConnect={() => openModal({
                                title: 'Interactive Brokers',
                                imageSrc: '/logo/IBKR.png',
                                type: 'api',
                                isFile: true,
                                color: 'purple',
                                formFields: [] 
                            })}
                        />
                        <IntegrationCard
                            title="Portfolio Performance"
                            subtitle={getCount('portfolio performance') > 0 ? `${getCount('portfolio performance')} import${getCount('portfolio performance') > 1 ? 's' : ''} effectué${getCount('portfolio performance') > 1 ? 's' : ''}` : "Import Historique (PEA/CTO)"}
                            imageSrc="/logo/PP.png"
                            color="cyan"
                            type="sync"
                            formFields={[]}
                            onConnect={() => openModal({
                                title: 'Portfolio Performance',
                                imageSrc: '/logo/PP.png',
                                type: 'sync',
                                isFile: true,
                                color: 'cyan',
                                formFields: [
                                    {
                                        name: 'accountType',
                                        label: 'Type de Compte',
                                        placeholder: 'Sélectionner...',
                                        type: 'select',
                                        options: [
                                            { label: 'PEA (Plan Épargne Actions)', value: 'PEA' },
                                            { label: 'CTO (Compte Titres Ordinaire)', value: 'CTO' }
                                        ]
                                    }
                                ]
                            })}
                        />
                    </div>
                </section>

                {/* CRYPTO SECTION */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500">
                            <Wallet size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Crypto & Web3</h2>
                    </div>

                    <div className="grid gap-4">
                        <IntegrationCard
                            title="Ledger"
                            subtitle={getCount('ledger') > 0 ? `${getCount('ledger')} import${getCount('ledger') > 1 ? 's' : ''} effectué${getCount('ledger') > 1 ? 's' : ''}` : "Synchro Hardware Wallet"}
                            imageSrc="/logo/Ledger.jpg"
                            color="purple"
                            type="sync"
                            formFields={[]}
                            onConnect={() => openModal({
                                title: 'Ledger',
                                imageSrc: '/logo/Ledger.jpg',
                                type: 'sync',
                                isFile: true,
                                color: 'purple',
                                formFields: [],
                            imageClassName: 'dark:invert' // Make black logo white only in dark mode
                        })}
                        imageClassName="dark:invert" // Make black logo white only in dark mode
                    />
                        <IntegrationCard
                            title="Metamask"
                            subtitle={getCount('metamask') > 0 ? `${getCount('metamask')} import${getCount('metamask') > 1 ? 's' : ''} effectué${getCount('metamask') > 1 ? 's' : ''}` : "Connection EVM"}
                            imageSrc="/logo/metamask.png"
                            color="purple"
                            type="wallet"
                            formFields={[
                                { name: 'address', label: 'Adresse Publique du Wallet', placeholder: '0x...' }
                            ]}
                            onConnect={() => openModal({
                                title: 'Metamask',
                                imageSrc: '/logo/metamask.png',
                                type: 'wallet',
                                color: 'purple',
                                formFields: [
                                    { name: 'address', label: 'Adresse Publique du Wallet', placeholder: '0x...' }
                                ]
                            })}
                        />
                        <IntegrationCard
                            title="Bitget"
                            subtitle={getCount('bitget') > 0 ? `${getCount('bitget')} import${getCount('bitget') > 1 ? 's' : ''} effectué${getCount('bitget') > 1 ? 's' : ''}` : "Import fichier"}
                            imageSrc="/logo/Bitget.png"
                            color="purple"
                            type="sync"
                            formFields={[]}
                            onConnect={() => openModal({
                                title: 'Bitget',
                                imageSrc: '/logo/Bitget.png',
                                type: 'sync',
                                isFile: true,
                                color: 'purple',
                                formFields: []
                            })}
                        />
                    </div>
                </section>
            </div>
        </div>
    </div>
);
}
