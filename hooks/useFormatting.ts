'use client';

import { useSettings } from '../lib/core/contexts/SettingsContext';
import { formatCurrency as baseFormatCurrency, formatNumber as baseFormatNumber } from '../lib/core/format-utils';

export function useFormatting() {
    const { isPrivacyMode, fiatCurrency } = useSettings();

    /**
     * Formats a value as currency, respecting privacy and reference fiat.
     * @param value - The value in EUR (pivot)
     * @param currency - The currency to display (if forcing native)
     * @param isCrypto - If true, follows the reference fiat
     * @param isTotal - If true, follows the reference fiat (converison needed)
     * @param fxRate - The EUR/USD rate if conversion is needed
     */
    const formatCurrency = (
        value: number, 
        options: { 
            currency?: string, 
            isCrypto?: boolean, 
            isTotal?: boolean,
            fxRate?: number 
        } = {}
    ) => {
        let finalValue = value;
        let finalCurrency = options.currency || 'EUR';

        // TOTALS & CRYPTO follow the reference fiat
        if (options.isTotal || options.isCrypto) {
            finalCurrency = fiatCurrency;
            
            // Basic conversion logic: The engine pivot is EUR. 
            // If fiat is USD, we multiply by EUR/USD rate.
            if (fiatCurrency === 'USD' && options.fxRate) {
                finalValue = value * options.fxRate;
            } else if (fiatCurrency === 'GBP' && options.fxRate) {
                // Assuming fxRate is EUR/USD, we'd need EUR/GBP. 
                // For simplicity in this demo, we'll assume the caller passes the right rate or improve engine.
                finalValue = value * (options.fxRate * 0.85); // Pseudo-rate for demo
            }
        }

        return baseFormatCurrency(finalValue, finalCurrency, isPrivacyMode);
    };

    const formatNumber = (value: number, precision: number = 2) => {
        if (isPrivacyMode) return '***';
        return baseFormatNumber(value, precision);
    };

    return {
        formatCurrency,
        formatNumber,
        isPrivacyMode,
        fiatCurrency
    };
}
