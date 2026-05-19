
import Papa from 'papaparse';
import { UnifiedTransaction, ImportResult } from './types';

export class BitgetFileImporter {
    public async import(fileBuffer: Buffer, filename: string): Promise<ImportResult> {
        console.log(`[BITGET-FILE] Importing ${filename}...`);

        let transactions: UnifiedTransaction[] = [];
        transactions = await this.parseCsv(fileBuffer);

        return {
            assets: [],
            transactions,
            symbols: []
        };
    }

    private async parseCsv(buffer: Buffer): Promise<UnifiedTransaction[]> {
        const content = buffer.toString('utf8');
        const transactions: UnifiedTransaction[] = [];

        const parseResult = Papa.parse(content, {
            header: true,
            skipEmptyLines: true
        });

        // @ts-ignore
        parseResult.data.forEach((row: any) => {
            try {
                // Bitget Futures "Fund Flow" headers:
                // Order, Date, Coin, Futures, Margin Mode, Type, Amount, Fee, Wallet balance

                const dateStr = row['Date'] || row['Time'] || row['Created Time'];
                const coin = row['Coin'];
                const futures = row['Futures'];
                const typeStr = (row['Type'] || row['Operation'] || '').toLowerCase();
                const amountRaw = row['Amount'];
                const feeRaw = row['Fee'];

                if (!dateStr || !amountRaw) return;

                const date = new Date(dateStr);

                // Net Change = Amount + Fee
                // In this CSV, Amount seems to be PnL (or Transfer Amount) and Fee is separate negative number.
                // Examples:
                // Close Long: Amount=4.11, Fee=-0.04. Net = +4.07
                // Settle Fee: Amount=-0.01, Fee=0. Net = -0.01
                // Transfer: Amount=1348, Fee=0. Net = +1348

                const amountVal = parseFloat(amountRaw.replace(/,/g, ''));
                const feeVal = feeRaw ? parseFloat(feeRaw.replace(/,/g, '')) : 0;

                const netChange = amountVal + feeVal;

                if (Math.abs(netChange) < 0.0000001) return;

                // Logic:
                // Capital = 'trans', 'deposit', 'withdraw'
                // Performance = Everything else

                let type: UnifiedTransaction['type'] = 'BUY';

                const isTransfer = typeStr.includes('trans') || typeStr.includes('deposit') || typeStr.includes('withdraw');

                if (isTransfer) {
                    if (netChange > 0) type = 'DEPOSIT';
                    else type = 'WITHDRAWAL';

                    transactions.push({
                        date,
                        type,
                        symbol: this.normalizeSymbol(coin),
                        quantity: Math.abs(netChange),
                        price: 0,
                        amount: netChange,
                        currency: 'USD',
                        source: 'Bitget File'
                    });
                } else {
                    // Performance -> Asset Injection
                    // We want to increase/decrease the asset quantity WITHOUT changing the Invested Capital.
                    // We use 'BUY' with Price = 0.
                    // If Gain: Quantity = +Gain. Cost = 0.
                    // If Loss: Quantity = -Loss. Cost = 0.

                    type = 'BUY';
                    transactions.push({
                        date,
                        type,
                        symbol: this.normalizeSymbol(coin),
                        quantity: netChange,
                        price: 0.000000001, // Use epsilon to bypass finance-engine "auto-fetch price if 0" logic
                        amount: 0, // No Cash impact!
                        currency: 'USD',
                        source: 'Bitget File'
                    });
                }

            } catch (e) {
                // skip
            }
        });

        return transactions;
    }

    private normalizeSymbol(coin: string): string {
        if (!coin) return 'USDT-USD';
        const s = coin.toUpperCase();
        if (s === 'USDT') return 'USDT-USD';
        if (['BTC', 'ETH', 'SOL'].includes(s)) return `${s}-USD`;
        return s;
    }
}
