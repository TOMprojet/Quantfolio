import fs from 'fs';
import path from 'path';
import { FinanceSettings } from '../types/settings';

const SETTINGS_PATH = path.join(process.cwd(), 'config', 'finance-settings.json');

const DEFAULT_SETTINGS: FinanceSettings = {
    cashSources: ["PP", "IBKR"],
    ignoredAssetSources: ["Ledger CSV", "Bitget"],
    fiatCurrency: "EUR",
    privacyMode: false,
    theme: 'dark',
    watchlist: ['MSFT', 'NVDA', 'TPL', 'FICO', 'ANET', 'MSCI', 'FTNT', 'MA', 'LB', 'CW8.PA'],
    fairPrices: {}
};

export class SettingsStore {
    static load(): FinanceSettings {
        try {
            if (fs.existsSync(SETTINGS_PATH)) {
                const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
                const data = JSON.parse(raw);
                return { ...DEFAULT_SETTINGS, ...data };
            }
        } catch (e) {
            console.error('[SETTINGS] Failed to load settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    static save(settings: FinanceSettings) {
        try {
            const dir = path.dirname(SETTINGS_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 4), 'utf8');
            console.log('[SETTINGS] Saved successfully.');
        } catch (e) {
            console.error('[SETTINGS] Failed to save settings:', e);
        }
    }

    static update(updates: Partial<FinanceSettings>) {
        const current = this.load();
        const updated = { ...current, ...updates };
        this.save(updated);
        return updated;
    }
}
