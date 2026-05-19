'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinanceSettings } from '../types/settings';
import { updateSettingsAction } from '../../../app/actions/settings-actions';

interface SettingsContextType {
    settings: FinanceSettings;
    updateSettings: (updates: Partial<FinanceSettings>) => Promise<void>;
    isPrivacyMode: boolean;
    fiatCurrency: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ 
    children, 
    initialSettings 
}: { 
    children: React.ReactNode; 
    initialSettings: FinanceSettings;
}) {
    const [settings, setSettings] = useState<FinanceSettings>(initialSettings);

    const updateSettings = async (updates: Partial<FinanceSettings>) => {
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);
        await updateSettingsAction(updates);
    };

    // Synchronize theme with document body
    useEffect(() => {
        const theme = settings.theme || 'dark';
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [settings.theme]);

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            updateSettings, 
            isPrivacyMode: !!settings.privacyMode,
            fiatCurrency: settings.fiatCurrency || 'EUR'
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
