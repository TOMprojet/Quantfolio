import Papa from 'papaparse';
import { PortfolioTransaction } from './csv-parser';

/**
 * IBKR CSV Parser (Format: Transaction History)
 */
export function parseIbkrCsv(content: string): PortfolioTransaction[] {
    const rawTransactions: PortfolioTransaction[] = [];
    
    const results = Papa.parse(content, {
        header: false,
        skipEmptyLines: true
    });

    const data = results.data as string[][];
    
    let summaryIndex = -1;
    let headerIndex = -1;

    for (let i = 0; i < data.length; i++) {
        if (data[i][0] === 'Summary' && data[i][1] === 'Data' && data[i][2] === 'Trésorerie finale') {
            summaryIndex = i;
        }
        if (data[i][0] === 'Transaction History' && data[i][1] === 'Header') {
            headerIndex = i;
        }
    }

    if (headerIndex === -1) return [];

    const headers = data[headerIndex];
    const colMap: Record<string, number> = {};
    headers.forEach((h, idx) => colMap[h] = idx);

    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (row[0] !== 'Transaction History' || row[1] !== 'Data') continue;

        const typeRaw = row[colMap['Transaction Type']]?.toLowerCase() || '';
        const dateRaw = row[colMap['Date']];
        const symbolRaw = row[colMap['Symbol']] || 'CASH';
        const qtyRaw = Math.abs(parseFloat((row[colMap['Quantity']] || '0').replace(/ /g, '').replace(/,/g, '')));
        const tradePrice = parseFloat((row[colMap['Price']] || '0').replace(/ /g, '').replace(/,/g, '')); 
        const priceCurrency = (row[colMap['Price Currency']] === '-' || !row[colMap['Price Currency']]) ? 'EUR' : row[colMap['Price Currency']];
        const commissionEur = Math.abs(parseFloat((row[colMap['Commission']] || '0').replace(/ /g, '').replace(/,/g, '')));
        const grossAmountEur = Math.abs(parseFloat((row[colMap['Gross Amount ']] || '0').replace(/ /g, '').replace(/,/g, '')));
        const netAmountRaw = parseFloat((row[colMap['Net Amount']] || '0').replace(/ /g, '').replace(/,/g, ''));
        const netAmountEur = parseFloat((row[colMap['Net Amount (in EUR)']] || row[colMap['Net Amount']] || '0').replace(/ /g, '').replace(/,/g, ''));
        const description = row[colMap['Description']] || '';

        let type: PortfolioTransaction['type'] = 'FEE';
        let skip = false;

        if (typeRaw.includes('buy')) type = 'BUY';
        else if (typeRaw.includes('sell')) type = 'SELL';
        else if (typeRaw.includes('dividend')) type = 'DIVIDEND';
        else if (typeRaw.includes('deposit')) type = 'DEPOSIT';
        else if (typeRaw.includes('withdrawal')) type = 'WITHDRAWAL';
        else if (typeRaw.includes('tax')) type = 'TAX';
        else if (typeRaw.includes('interest')) type = 'INTEREST';
        else if (typeRaw.includes('adjustment')) type = 'FEE';
        else skip = true;

        if (skip) continue;

        // Calculate Price including Fees in Native Currency (USD/GBP etc)
        // We find the FX rate of the trade by comparing USD Trade Value and EUR Gross Amount
        let priceWithFees = tradePrice;
        if (type === 'BUY' || type === 'SELL') {
            const tradeValueNative = tradePrice * qtyRaw;
            if (tradeValueNative > 0 && grossAmountEur > 0) {
                const fxRate = tradeValueNative / grossAmountEur;
                const commissionNative = commissionEur * fxRate;
                // For BUY, fees increase PRU. For SELL, fees decrease proceed.
                priceWithFees = type === 'BUY' 
                    ? (tradeValueNative + commissionNative) / qtyRaw 
                    : (tradeValueNative - commissionNative) / qtyRaw;
            }
        }

        rawTransactions.push({
            date: dateRaw,
            type,
            symbol: symbolRaw === '-' ? 'CASH' : symbolRaw,
            quantity: qtyRaw,
            price: priceWithFees, 
            amount: netAmountRaw, // Original Currency Amount
            amountEur: netAmountEur, // EUR Amount
            currency: priceCurrency, // Use the actual price currency (e.g. USD)
            description
        });
    }

    const mergedTransactions: PortfolioTransaction[] = [];
    const divGroups: Record<string, PortfolioTransaction> = {};

    for (const tx of rawTransactions) {
        if (tx.type === 'DIVIDEND' || tx.type === 'TAX') {
            const key = `${tx.date}_${tx.symbol}`;
            if (divGroups[key]) {
                divGroups[key].amount += tx.amount;
                if (tx.amountEur !== undefined) {
                    divGroups[key].amountEur = (divGroups[key].amountEur || 0) + tx.amountEur;
                }
                divGroups[key].type = 'DIVIDEND';
                divGroups[key].description += ` (Tax incl.)`;
            } else {
                divGroups[key] = { ...tx };
            }
        } else {
            mergedTransactions.push(tx);
        }
    }
    
    mergedTransactions.push(...Object.values(divGroups));

    if (summaryIndex !== -1) {
        const endingCash = parseFloat((data[summaryIndex][3] || '0').replace(/ /g, '').replace(/,/g, ''));
        let calculatedFlows = 0;
        for (const tx of mergedTransactions) {
            calculatedFlows += (tx.amount || 0);
        }

        const adjustment = Math.round((endingCash - calculatedFlows) * 100) / 100;
        if (Math.abs(adjustment) > 0.01) {
            mergedTransactions.push({
                date: new Date().toISOString(),
                type: adjustment > 0 ? 'INTEREST' : 'FEE', 
                symbol: 'CASH',
                quantity: 0,
                price: 1,
                amount: adjustment,
                amountEur: adjustment,
                currency: 'EUR',
                description: 'Régularisation solde (Ancrage CSV)'
            });
        }
    }

    return mergedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

