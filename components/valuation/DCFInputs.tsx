'use client';
import React from 'react';
import { RefreshCcw, Save, TrendingUp } from 'lucide-react';
import { ValuationParams } from '@/lib/finance/valuation';

interface DCFInputsProps {
    symbol: string;
    horizon: number;
    setHorizon: (v: number) => void;
    modelType: 'double' | 'eps' | 'fcf';
    epsParams: ValuationParams;
    setEpsParams: (p: ValuationParams) => void;
    fcfParams: ValuationParams;
    setFcfParams: (p: ValuationParams) => void;
    setIsModified: (v: boolean) => void;
    handleSave: () => void;
    results: any;
    currency: string;
}

const InputField = ({ label, value, onChange, suffix, hint }: any) => (
    <div className="flex flex-col gap-1.5 mb-3">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-surface/50 border border-foreground/10 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500">{suffix}</span>
        </div>
        {hint && <p className="text-[9px] text-slate-600 font-medium">{hint}</p>}
    </div>
);

export default function DCFInputs({
    symbol,
    horizon,
    setHorizon,
    modelType,
    epsParams,
    setEpsParams,
    fcfParams,
    setFcfParams,
    setIsModified,
    handleSave,
    results,
    currency
}: DCFInputsProps) {
    return (
        <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-5 flex flex-col gap-6 shadow-xl backdrop-blur-sm h-full">
            <div className="flex items-center justify-between pb-2 border-b border-foreground/5">
                <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-primary" />
                    <h3 className="font-bold text-foreground text-base">Hypothèse de croissance</h3>
                </div>
                <button
                    onClick={() => {
                        localStorage.removeItem(`val_v2_${symbol}`);
                        window.location.reload();
                    }}
                    className="text-[9px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    title="Réinitialiser avec les données du marché"
                >
                    <RefreshCcw size={10} /> Réinitialiser
                </button>
            </div>

            <InputField
                label="Horizon de projection (Commun)"
                value={horizon}
                onChange={(v: number) => { setHorizon(v); setIsModified(true); }}
                suffix="Ans"
            />

            {/* EPS */}
            {(modelType === 'double' || modelType === 'eps') && (
                <div className="bg-surface/50 rounded-xl p-3 border border-foreground/5">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Modèle EPS (Bénéfices)</span>
                        <span className="text-foreground text-lg font-bold">{results.epsRes.fairPrice.toFixed(0)} {currency}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="EPS (TTM)" value={epsParams.baseValue} onChange={(v: number) => { setEpsParams({ ...epsParams, baseValue: v }); setIsModified(true); }} suffix={currency} />
                        <InputField label="Croissance %" value={epsParams.growthRate} onChange={(v: number) => { setEpsParams({ ...epsParams, growthRate: v }); setIsModified(true); }} suffix="%" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="PE Final" value={epsParams.terminalMultiple} onChange={(v: number) => { setEpsParams({ ...epsParams, terminalMultiple: v }); setIsModified(true); }} />
                        <InputField label="Rendement %" value={epsParams.discountRate} onChange={(v: number) => { setEpsParams({ ...epsParams, discountRate: v }); setIsModified(true); }} suffix="%" />
                    </div>
                </div>
            )}

            {/* FCF */}
            {(modelType === 'double' || modelType === 'fcf') && (
                <div className="bg-surface/50 rounded-xl p-3 border border-foreground/5">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Modèle DCF (Cash Flow)</span>
                        <span className="text-foreground text-lg font-bold">{results.fcfRes.fairPrice.toFixed(0)} {currency}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="FCF/Share" value={fcfParams.baseValue} onChange={(v: number) => { setFcfParams({ ...fcfParams, baseValue: v }); setIsModified(true); }} suffix={currency} />
                        <InputField label="Croissance %" value={fcfParams.growthRate} onChange={(v: number) => { setFcfParams({ ...fcfParams, growthRate: v }); setIsModified(true); }} suffix="%" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="P/FCF Final" value={fcfParams.terminalMultiple} onChange={(v: number) => { setFcfParams({ ...fcfParams, terminalMultiple: v }); setIsModified(true); }} />
                        <InputField label="Rendement %" value={fcfParams.discountRate} onChange={(v: number) => { setFcfParams({ ...fcfParams, discountRate: v }); setIsModified(true); }} suffix="%" />
                    </div>
                </div>
            )}
            <div className="mt-auto pt-4 flex gap-3">
                <button
                    onClick={handleSave}
                    className="flex-1 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 backdrop-blur-md shadow-lg"
                >
                    <Save size={18} /> Sauvegarder
                </button>
            </div>
        </div>
    );
}
