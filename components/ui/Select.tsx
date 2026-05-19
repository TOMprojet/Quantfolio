'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface SelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
}

export default function Select({ options, value, onChange, label }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value) || options[0];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            {label && <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">{label}</label>}
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-12 bg-foreground/5 border border-foreground/10 rounded-xl px-4 flex items-center justify-between text-foreground hover:bg-foreground/10 transition-all group"
            >
                <div className="flex items-center gap-3">
                    {selectedOption.icon && <span className="text-primary">{selectedOption.icon}</span>}
                    <span className="font-semibold">{selectedOption.label}</span>
                </div>
                <ChevronDown 
                    size={18} 
                    className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-[1000] w-full mt-2 bg-surface/98 backdrop-blur-2xl border border-foreground/10 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors group ${
                                        value === option.value ? 'bg-primary/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {option.icon && (
                                            <span className={`${value === option.value ? 'text-primary' : 'text-slate-500 dark:text-slate-400 group-hover:text-primary'}`}>
                                                {option.icon}
                                            </span>
                                        )}
                                        <span className={`text-sm ${value === option.value ? 'text-foreground font-bold' : 'text-slate-600 dark:text-slate-300 group-hover:text-foreground'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                    {value === option.value && <Check size={16} className="text-primary" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
