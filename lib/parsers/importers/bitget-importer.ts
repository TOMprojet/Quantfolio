import crypto from 'crypto';
import { UnifiedTransaction, ImportResult } from './types';
import { isScam } from '../../../config/blacklist';

export class BitgetImporter {
    public async import(integrations: any): Promise<ImportResult> {
        console.log('[BITGET-IMPORTER] Starting Import. Configs found:', integrations.bitget?.length);
        if (!integrations.bitget || !Array.isArray(integrations.bitget)) {
            console.log('[BITGET-IMPORTER] No Bitget config found.');
            return { assets: [], transactions: [], symbols: [] };
        }

        const transactions: UnifiedTransaction[] = [];
        const symbols = new Set<string>();

        // FETCH PARALLEL
        for (const config of integrations.bitget) {
            try {
                // FUTURES (Mix & Elite)
                const productTypes = ['USDT-FUTURES', 'USDC-FUTURES', 'COIN-FUTURES'];
                for (const pType of productTypes) {
                    try {
                        // NEW: Fetch PnL History (Bills)
                        console.log(`[BITGET] Fetching PnL Bills for ${pType}...`);
                        const bills = await this.fetchBills(config, pType);
                        bills.forEach((b: any) => {
                            // Bitget Bills types: 1=Transferred in, 2=Transferred out, etc.
                            // We look for realized PnL or funding fees? 
                            // Actually 'realizedPNL' is usually the target.
                            const pnl = parseFloat(b.pnl || '0');
                            if (Math.abs(pnl) > 0.001) {
                                transactions.push({
                                    date: new Date(parseInt(b.cTime)),
                                    type: pnl > 0 ? 'DIVIDEND' : 'FEE', // Map PnL as discrete value changes
                                    symbol: `${b.marginCoin}-USD`,
                                    quantity: 0,
                                    price: 0,
                                    amount: pnl,
                                    currency: 'USD',
                                    source: `Bitget PnL (${pType})`
                                });
                            }
                        });
                    } catch (e) {
                        // console.log(`[BITGET] Futures/PnL (${pType}) fetch failed.`);
                    }
                }

                // SAVINGS & EARN removed per user request

                // COPY TRADING check removed as funds appear in standard Futures account.

            } catch (e) {
                console.error('[BITGET-IMPORTER] Error', e);
            }
        }

        return {
            assets: [],
            transactions,
            symbols: Array.from(symbols)
        };
    }


    private async fetchBills(config: any, productType: string): Promise<any[]> {
        const { apiKey, secretKey, passphrase } = config;
        const timestamp = Date.now().toString();
        const method = 'GET';
        // We fetch the last 3 months of bills
        const startTime = (Date.now() - 90 * 24 * 3600 * 1000).toString();
        const path = `/api/v2/mix/account/bill?productType=${productType}&startTime=${startTime}`;

        const msg = `${timestamp}${method}${path}`;
        const sign = crypto.createHmac('sha256', secretKey).update(msg).digest('base64');

        const url = `https://api.bitget.com${path}`;
        const res = await fetch(url, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-PASSPHRASE': passphrase,
                'ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) return [];
        const json = await res.json();
        return json.data?.billList || [];
    }

    private async fetchFutures(config: any, productType: string): Promise<any[]> {
        const { apiKey, secretKey, passphrase } = config;
        const timestamp = Date.now().toString();
        const method = 'GET';
        const path = `/api/v2/mix/account/accounts?productType=${productType}`;

        const msg = `${timestamp}${method}${path}`;
        const sign = crypto.createHmac('sha256', secretKey).update(msg).digest('base64');

        const url = `https://api.bitget.com${path}`;
        const res = await fetch(url, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-PASSPHRASE': passphrase,
                'ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error(res.statusText);
        const json = await res.json();
        if (json.code !== '00000') throw new Error(json.msg);
        return json.data || [];
    }

    private async fetchAssets(config: any): Promise<any[]> {
        const { apiKey, secretKey, passphrase } = config;
        const timestamp = Date.now().toString();
        const method = 'GET';
        const path = '/api/v2/spot/account/assets';

        const msg = `${timestamp}${method}${path}`;
        const sign = crypto.createHmac('sha256', secretKey).update(msg).digest('base64');

        const url = `https://api.bitget.com${path}`;
        const res = await fetch(url, {
            headers: {
                'ACCESS-KEY': apiKey,
                'ACCESS-SIGN': sign,
                'ACCESS-PASSPHRASE': passphrase,
                'ACCESS-TIMESTAMP': timestamp,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }

        const json = await res.json();
        if (json.code !== '00000') {
            throw new Error(JSON.stringify(json));
        }

        console.log(`[BITGET-DEBUG] Raw Spot Assets Response (${config.apiKey.substring(0, 4)}...):`, JSON.stringify(json.data));
        return json.data || [];
    }
}

