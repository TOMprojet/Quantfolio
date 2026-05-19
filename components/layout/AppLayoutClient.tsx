'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import { SettingsProvider } from '../../lib/core/contexts/SettingsContext';
import { FinanceSettings } from '../../lib/core/types/settings';
import { Menu, X } from 'lucide-react';

interface AppLayoutClientProps {
    children: React.ReactNode;
    initialSettings: FinanceSettings;
}

export default function AppLayoutClient({ children, initialSettings }: AppLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // Intercept runtime errors from browser extensions (e.g. MetaMask)
        // to prevent Next.js dev server overlay from crashing the UI.
        const handleError = (event: ErrorEvent) => {
            const isExtensionError = 
                (event.filename && event.filename.includes('chrome-extension://')) || 
                (event.message && event.message.toLowerCase().includes('metamask')) ||
                (event.error && event.error.stack && event.error.stack.includes('chrome-extension://')) ||
                (event.error && event.error.message && event.error.message.toLowerCase().includes('metamask'));

            if (isExtensionError) {
                console.warn('Suppressed chrome extension error:', event.message);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason?.message || String(reason || '');
            const stack = reason?.stack || '';
            const isExtensionError = 
                message.toLowerCase().includes('metamask') || 
                stack.includes('chrome-extension://');

            if (isExtensionError) {
                console.warn('Suppressed chrome extension promise rejection:', message);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('error', handleError, true);
        window.addEventListener('unhandledrejection', handleRejection, true);
        return () => {
            window.removeEventListener('error', handleError, true);
            window.removeEventListener('unhandledrejection', handleRejection, true);
        };
    }, []);

    return (
        <SettingsProvider initialSettings={initialSettings}>
            <div className="flex h-screen w-full bg-background overflow-hidden relative">
                {/* Mobile Backdrop */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Sidebar Wrapper */}
                <div className={`
                    fixed lg:relative z-50 h-full transition-all duration-500 ease-in-out overflow-hidden no-scrollbar
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <Sidebar onClose={() => setIsSidebarOpen(false)} />
                </div>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0 relative h-full">
                    {/* Mobile Top Nav */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-foreground/5 bg-background/80 backdrop-blur-md z-30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                                <span className="text-primary font-bold text-xs">Q</span>
                            </div>
                            <span className="font-bold text-xs tracking-widest text-foreground uppercase">Quantfolio</span>
                        </div>
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-xl bg-foreground/5 border border-foreground/5 text-slate-400 hover:text-primary transition-all"
                        >
                            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                        <div className="flex flex-col gap-8 w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 pb-32">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </SettingsProvider>
    );
}
