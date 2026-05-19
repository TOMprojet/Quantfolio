'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Settings as SettingsIcon, 
    Globe, 
    Shield, 
    Trash2, 
    RefreshCcw, 
    Database, 
    Save,
    CheckCircle2,
    AlertTriangle,
    Moon,
    Sun,
    Monitor
} from 'lucide-react';
import { FinanceSettings } from '../../../lib/core/types/settings';
import { clearPriceCacheAction, resetPortfolioAction } from '../../actions/settings-actions';
import ConfirmModal from '../../../components/ConfirmModal';
import { useSettings } from '../../../lib/core/contexts/SettingsContext';
import Select from '../../../components/ui/Select';
import PageHeader from '../../../components/ui/PageHeader';

export default function SettingsClient({ initialSettings }: { initialSettings: FinanceSettings }) {
    const { settings, updateSettings, isPrivacyMode } = useSettings();
    const [localSettings, setLocalSettings] = useState<FinanceSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    
    // Modal states
    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [showConfirmClearCache, setShowConfirmClearCache] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await updateSettings(localSettings);
            setMessage({ type: 'success', text: 'Paramètres enregistrés avec succès' });
            setTimeout(() => setMessage(null), 3000);
        } catch (e) {
            setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
        } finally {
            setIsSaving(false);
        }
    };

    const currencyOptions = [
        { value: 'EUR', label: 'Euro (€)', icon: <span className="font-bold">€</span> },
        { value: 'USD', label: 'US Dollar ($)', icon: <span className="font-bold">$</span> },
        { value: 'GBP', label: 'British Pound (£)', icon: <span className="font-bold">£</span> },
    ];

    const themeOptions = [
        { value: 'dark', label: 'Sombre', icon: <Moon size={16} /> },
        { value: 'light', label: 'Clair', icon: <Sun size={16} /> },
        { value: 'system', label: 'Système', icon: <Monitor size={16} /> },
    ];

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar bg-background">
            <div className="p-4 sm:p-8 lg:p-10 space-y-8 sm:space-y-12">
                <PageHeader
                    title="Paramètres"
                    subtitle="Configurez l'esthétique et les calculs de votre plateforme."
                    icon={SettingsIcon}
                    rightContent={
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`group relative flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs tracking-[0.2em] transition-all duration-500 overflow-hidden shadow-lg w-full sm:w-auto ${
                                isSaving 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-primary/20 text-primary border border-primary/30 hover:border-primary/50'
                            }`}
                        >
                            <div className="absolute inset-0 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all duration-500" />
                            <div className="relative flex items-center gap-3">
                                {isSaving ? <RefreshCcw className="animate-spin w-4 h-4 sm:w-[18px] sm:h-[18px]" /> : <Save className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
                                ENREGISTRER
                            </div>
                        </button>
                    }
                />

                {message && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 sm:p-5 rounded-2xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    >
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                        <span className="font-bold text-sm sm:text-base">{message.text}</span>
                    </motion.div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    
                    {/* Preferences Section */}
                    <div className="lg:col-span-8 space-y-8 sm:space-y-10">
                        <section className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 space-y-8 sm:space-y-10 border-foreground/5 shadow-2xl relative group transition-all duration-500 hover:border-foreground/10 overflow-hidden">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -mr-64 -mt-64 rounded-full opacity-50" />
                            
                            <h2 className="text-2xl font-bold text-foreground flex items-center gap-4 relative z-10">
                                <span className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    <Globe className="text-primary" size={24} />
                                </span>
                                Préférences Générales
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                                <Select 
                                    label="Devise de Référence"
                                    options={currencyOptions}
                                    value={localSettings.fiatCurrency}
                                    onChange={(v) => setLocalSettings({...localSettings, fiatCurrency: v})}
                                />

                                <Select 
                                    label="Thème"
                                    options={themeOptions}
                                    value={localSettings.theme || 'dark'}
                                    onChange={(v: any) => setLocalSettings({...localSettings, theme: v})}
                                />
                            </div>

                            <div className="pt-10 border-t border-foreground/5 relative">
                                <div className="flex items-center justify-between p-8 bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] group/toggle hover:bg-foreground/[0.04] hover:border-foreground/10 transition-all duration-500">
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-foreground flex items-center gap-3">
                                            <Shield className="text-primary" size={20} />
                                            Mode Confidentialité
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Masque automatiquement tous vos prix et soldes sur l'application.</p>
                                    </div>
                                    <button
                                        onClick={() => setLocalSettings({...localSettings, privacyMode: !localSettings.privacyMode})}
                                        className={`w-16 h-8 rounded-full transition-all duration-500 flex items-center px-1.5 shadow-inner relative ${
                                            localSettings.privacyMode ? 'bg-primary' : 'bg-slate-700'
                                        }`}
                                    >
                                        <motion.div 
                                            animate={{ x: localSettings.privacyMode ? 32 : 0 }}
                                            className="w-5 h-5 bg-white rounded-full shadow-lg relative z-10"
                                        />
                                        <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${localSettings.privacyMode ? 'opacity-40 shadow-glow' : 'opacity-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Additional info footer */}
                        <div className="flex items-center justify-center gap-6 px-8 text-slate-600 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] opacity-50">
                            <span>Quantfolio Engine v2.4.0</span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full" />
                            <span>Proprietary System</span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full" />
                            <span>Secure Persistence</span>
                        </div>
                    </div>

                    {/* Maintenance Sidebar Section */}
                    <aside className="lg:col-span-4 space-y-8">
                        <section className="glass-panel rounded-[2.5rem] p-10 space-y-8 border-foreground/5 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-foreground/10">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-4 mb-2">
                                <span className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                    <Database className="text-primary" size={20} />
                                </span>
                                Maintenance
                            </h2>

                            <div className="space-y-5">
                                <button 
                                    onClick={() => setShowConfirmClearCache(true)}
                                    className="w-full flex items-center justify-between p-6 bg-foreground/[0.03] border border-foreground/5 rounded-2xl hover:bg-foreground/[0.06] hover:border-foreground/10 transition-all group overflow-hidden relative"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <RefreshCcw size={20} className="text-slate-500 group-hover:text-primary transition-all group-hover:rotate-180 duration-700" />
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Vider le cache</span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 relative z-10 hidden xl:block">Purger</span>
                                </button>

                                <button 
                                    onClick={() => setShowConfirmReset(true)}
                                    className="w-full flex items-center justify-between p-6 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 hover:border-red-500/20 transition-all group relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <Trash2 size={20} className="text-red-400 group-hover:text-red-500 transition-colors" />
                                        <span className="text-sm font-bold text-red-400 group-hover:text-red-500">Réinitialiser</span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/60 relative z-10 hidden xl:block">Danger</span>
                                </button>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-500 text-center leading-relaxed font-medium">
                                Ces actions modifient directement vos fichiers de données locaux.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>

            {/* Modals */}
            <ConfirmModal 
                isOpen={showConfirmClearCache}
                title="Vider le cache ?"
                message="Cela forcera le téléchargement des nouveaux prix pour tous vos actifs."
                confirmLabel="Vider"
                onCancel={() => setShowConfirmClearCache(false)}
                onConfirm={async () => {
                    await clearPriceCacheAction();
                    setShowConfirmClearCache(false);
                    setMessage({ type: 'success', text: 'Cache vidé' });
                }}
                isDanger={false}
            />

            <ConfirmModal 
                isOpen={showConfirmReset}
                title="Réinitialisation Totale ?"
                message="Cette action supprimera toutes vos transactions et videra votre portefeuille. Cette action est irréversible."
                confirmLabel="Réinitialiser"
                onCancel={() => setShowConfirmReset(false)}
                onConfirm={async () => {
                    await resetPortfolioAction();
                    setShowConfirmReset(false);
                    setMessage({ type: 'success', text: 'Portefeuille réinitialisé' });
                }}
                isDanger={true}
            />
        </div>
    );
}
