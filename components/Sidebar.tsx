'use client';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard, FileText, Calculator,
    BarChart3, Upload, Settings, LogOut, Wallet, Menu, X
} from 'lucide-react';

interface SidebarProps {
    isMobileOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isMobileOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'portfolio', label: 'Portefeuille', icon: Wallet, href: '/portfolio' },
        { id: 'analyse', label: 'Analyse', icon: BarChart3, href: '/analyse' },
        { id: 'watchlist', label: 'Watchlist', icon: FileText, href: '/watchlist' },
        { id: 'valuation', label: 'Valorisation', icon: Calculator, href: '/valuation' },
        { id: 'import', label: 'Import', icon: Upload, href: '/import' },
        { id: 'settings', label: 'Paramètres', icon: Settings, href: '/settings' },
    ];

    return (
        <>
            {/* MOBILE OVERLAY */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-[101] 
                bg-surface border-r border-foreground/5 
                flex flex-col transition-all duration-500 ease-in-out
                ${isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'}
                lg:relative lg:w-20 xl:w-60 px-4 xl:px-5 py-4 xl:py-8 shrink-0 h-screen no-scrollbar
            `}>
                {/* LOGO SECTION */}
                <div className="mb-8 xl:mb-12 px-2 flex items-center gap-4 group cursor-pointer overflow-hidden">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow shrink-0 transition-transform duration-500 group-hover:scale-110">
                        <span className="font-bold text-white text-xl">Q</span>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-foreground whitespace-nowrap lg:hidden xl:block transition-all duration-300 transform origin-left">
                        QUANTFOLIO
                    </h1>
                </div>

                {/* NAVIGATION */}
                <nav className="flex-1 space-y-2 xl:space-y-3 overflow-y-auto no-scrollbar">
                    <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-4 whitespace-nowrap lg:hidden xl:block">Menu Principal</p>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                onClick={onClose}
                                className={`
                                    w-full flex items-center gap-4 px-3 py-3 xl:px-4 xl:py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 transform group
                                    ${isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-glow' : 'text-slate-500 dark:text-slate-400 border border-transparent hover:bg-foreground/[0.03] hover:text-foreground hover:translate-x-1'}
                                `}
                            >
                                <div className={`p-2 rounded-xl transition-colors duration-300 shrink-0 ${isActive ? 'bg-primary/10' : 'bg-transparent group-hover:bg-primary/10'}`}>
                                    <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-500 group-hover:text-primary'} />
                                </div>
                                <span className="tracking-tight whitespace-nowrap lg:hidden xl:block">{item.label}</span>
                                
                                {/* Tooltip for narrow mode */}
                                <div className="absolute left-full ml-4 px-3 py-2 bg-background border border-foreground/10 rounded-xl text-xs opacity-0 invisible group-hover:lg:visible group-hover:lg:opacity-100 xl:hidden transition-all duration-200 z-50 whitespace-nowrap shadow-2xl">
                                    {item.label}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* FOOTER ACTION */}
                <div className="mt-auto pt-8 border-t border-foreground/5">
                    <button className="w-full flex items-center gap-4 px-3 py-3 xl:px-5 xl:py-4 rounded-2xl text-sm font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group overflow-hidden">
                        <div className="p-2 rounded-xl bg-red-500/5 group-hover:bg-red-500/10 shrink-0 outline outline-transparent">
                            <LogOut size={20} />
                        </div>
                        <span className="tracking-tight whitespace-nowrap lg:hidden xl:block">Déconnexion</span>
                    </button>
                    
                    {/* CLOSE FOR MOBILE */}
                    <button 
                        onClick={onClose}
                        className="lg:hidden mt-4 w-full flex items-center justify-center p-3 rounded-xl bg-foreground/5 text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>
            </aside>
        </>
    );
}
