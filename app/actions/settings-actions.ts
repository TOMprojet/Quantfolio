'use server';

import { SettingsStore } from '../../lib/core/persistence/settings-store';
import { FinanceSettings } from '../../lib/core/types/settings';
import { revalidatePath } from 'next/cache';

/**
 * Met à jour les réglages de l'application
 */
export async function updateSettingsAction(values: Partial<FinanceSettings>) {
    try {
        SettingsStore.update(values);
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        console.error('Failed to update settings:', e);
        return { success: false, error: 'Erreur lors de la sauvegarde' };
    }
}

/**
 * Purge le cache des prix du marché
 */
export async function clearPriceCacheAction() {
    try {
        const fs = require('fs');
        const path = require('path');
        const cachePath = path.join(process.cwd(), 'data', 'tiingo-cache.json');
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
        }
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        console.error('Failed to clear cache:', e);
        return { success: false, error: 'Erreur lors de la purge du cache' };
    }
}

/**
 * Réinitialise complètement le portefeuille (Supprime toutes les transactions)
 */
export async function resetPortfolioAction() {
    try {
        const fs = require('fs');
        const path = require('path');
        const masterPath = path.join(process.cwd(), 'private', 'portfolio-master.json');
        if (fs.existsSync(masterPath)) {
            // On ne supprime pas le fichier pour garder la structure, on le vide via le store
            const empty = {
                transactions: [],
                assets: {},
                metrics: [],
                lastUpdated: new Date().toISOString(),
                sources: []
            };
            fs.writeFileSync(masterPath, JSON.stringify(empty, null, 2));
        }
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        console.error('Failed to reset portfolio:', e);
        return { success: false, error: 'Erreur lors de la réinitialisation' };
    }
}
