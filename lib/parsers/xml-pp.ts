import { XMLParser } from 'fast-xml-parser';
import { UnifiedTransaction } from './importers/types';

const PP_PRECISION_AMOUNT = 100;
const PP_PRECISION_SHARES = 100000000;

const symbolMappings: Record<string, string> = {
    'CW8.PA': 'CW8.PA',
    'Amundi MSCI World': 'CW8.PA'
};

export function parsePortfolioPerformanceXml(xmlString: string): UnifiedTransaction[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });

    try {
        const parsedObj = parser.parse(xmlString);
        const client = parsedObj.client || parsedObj;
        if (!client) return [];

        // --- PHASE 1: Build Object Path Map ---
        const objectToPath = new Map<any, string>();
        const pathToObject = new Map<string, any>();
        
        const traverseAndMap = (obj: any, currentPath: string) => {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach((item, i) => {
                    traverseAndMap(item, `${currentPath}[${i + 1}]`);
                });
            } else {
                objectToPath.set(obj, currentPath);
                pathToObject.set(currentPath, obj);
                for (const key of Object.keys(obj)) {
                    traverseAndMap(obj[key], `${currentPath}/${key}`);
                }
            }
        };

        if (client.accounts) traverseAndMap(client.accounts, 'accounts');
        if (client.securities) traverseAndMap(client.securities, 'securities');
        if (client.portfolios) traverseAndMap(client.portfolios, 'portfolios');

        const getByPath = (obj: any, pathStr: string) => {
            if (!pathStr) return obj;
            const pathParts = pathStr.split('/');
            let current = obj;
            for (const p of pathParts) {
                if (!current) return null;
                const match = p.match(/^([^\[]+)(?:\[(\d+)\])?$/);
                if (match) {
                    const [, name, idxStr] = match;
                    current = current[name];
                    if (idxStr) {
                        const idx = parseInt(idxStr, 10) - 1;
                        current = Array.isArray(current) ? current[idx] : current;
                    } else if (Array.isArray(current)) {
                        current = current[0];
                    }
                }
            }
            return current;
        };

        // --- PHASE 2: Reference Resolvers ---
        const getReference = (obj: any) => obj?.reference || obj?.['@_reference'];

        const resolvePath = (currentPath: string, ref: string): any => {
            let parts = currentPath.split('/');
            const refParts = ref.split('/');
            for (const p of refParts) {
                if (p === '..') parts.pop();
                else if (p !== '.') parts.push(p);
            }
            const targetPath = parts.join('/');
            
            let resolved = pathToObject.get(targetPath) || getByPath(client, targetPath);
            
            const nestedRef = getReference(resolved);
            if (nestedRef) {
                return resolvePath(targetPath, nestedRef);
            }
            
            return resolved;
        };

        const resolveSecurity = (tObj: any, fallbackPath: string) => {
            if (tObj.security) {
                const ref = getReference(tObj.security);
                if (ref) {
                    const sec = resolvePath(fallbackPath + '/security', ref);
                    if (sec) return sec;
                }
                return tObj.security;
            }
            return null;
        };

        // --- PHASE 3: Transaction Extraction ---
        const allTransactions: UnifiedTransaction[] = [];
        const seenUuids = new Set<string>();

        const processTransaction = (txEntry: any, entryPath: string, accountName: string) => {
            let t = txEntry;
            const ref = getReference(txEntry);
            if (ref) {
                t = resolvePath(entryPath, ref);
            }

            if (!t || !t.type) return;

            const uuid = t.uuid;
            if (!uuid || seenUuids.has(uuid)) return;

            let otherSideUuid: string | null = null;
            if (t.crossEntry) {
                let cross = t.crossEntry;
                const crossRef = getReference(cross);
                if (crossRef) {
                    const basePath = objectToPath.get(cross) || (entryPath + '/crossEntry');
                    cross = resolvePath(basePath, crossRef) || cross;
                }

                // Try to find a UUID on the other side
                if (cross.portfolioTransaction) {
                    const p = cross.portfolioTransaction;
                    const pRef = getReference(p);
                    if (pRef) {
                        const pBasePath = objectToPath.get(p) || (objectToPath.get(cross) ? objectToPath.get(cross) + '/portfolioTransaction' : entryPath + '/crossEntry/portfolioTransaction');
                        otherSideUuid = resolvePath(pBasePath, pRef)?.uuid;
                    } else {
                        otherSideUuid = p.uuid;
                    }
                } else if (cross.accountTransaction) {
                    const a = cross.accountTransaction;
                    const aRef = getReference(a);
                    if (aRef) {
                        const aBasePath = objectToPath.get(a) || (objectToPath.get(cross) ? objectToPath.get(cross) + '/accountTransaction' : entryPath + '/crossEntry/accountTransaction');
                        otherSideUuid = resolvePath(aBasePath, aRef)?.uuid;
                    } else {
                        otherSideUuid = a.uuid;
                    }
                }
            }

            if (otherSideUuid && seenUuids.has(otherSideUuid)) return;

            seenUuids.add(uuid);
            if (otherSideUuid) seenUuids.add(otherSideUuid);

            const typeStr = (t.type || '').toUpperCase();
            const dateStr = t.date ? t.date.split('T')[0] : '';
            if (!dateStr) return;

            let pTx = t;
            if (t.crossEntry && t.crossEntry.portfolioTransaction) {
                const pTxRef = t.crossEntry.portfolioTransaction;
                const pRef = getReference(pTxRef);
                if (pRef) {
                    const basePath = objectToPath.get(t.crossEntry) || entryPath + '/crossEntry';
                    pTx = resolvePath(basePath + '/portfolioTransaction', pRef) || pTxRef;
                } else {
                    pTx = pTxRef;
                }
            }

            const getAmount = (obj: any) => {
                if (!obj.amount) return 0;
                if (typeof obj.amount === 'string' || typeof obj.amount === 'number') return parseFloat(obj.amount);
                if (obj.amount['@_amount']) return parseFloat(obj.amount['@_amount']);
                if (obj.amount['#text']) return parseFloat(obj.amount['#text']);
                return 0;
            };

            const amountVal = getAmount(t) / PP_PRECISION_AMOUNT;
            
            // Quantity Extraction Logic
            const getQuantity = (obj: any) => {
                if (obj.shares !== undefined && obj.shares != 0) return parseFloat(obj.shares);
                // Fallback to units
                const unitList = Array.isArray(obj.units?.unit) ? obj.units.unit : (obj.units?.unit ? [obj.units.unit] : []);
                if (unitList.length > 0) {
                    const firstUnit = unitList[0];
                    if (typeof firstUnit.amount === 'string' || typeof firstUnit.amount === 'number') return parseFloat(firstUnit.amount);
                    if (firstUnit.amount?.['@_amount']) return parseFloat(firstUnit.amount['@_amount']);
                    return 0;
                }
                return 0;
            };

            const rawSharesNum = getQuantity(pTx) || getQuantity(t);
            const sharesVal = rawSharesNum / PP_PRECISION_SHARES;
            
            let sec = resolveSecurity(t, entryPath);
            if (!sec && pTx !== t) {
                sec = resolveSecurity(pTx, objectToPath.get(pTx) || entryPath);
            }
            
            let symbol = sec?.symbol || sec?.tickerSymbol || sec?.name || 'CASH';
            if (symbolMappings[symbol]) symbol = symbolMappings[symbol];


            let mappedType: UnifiedTransaction['type'] = 'FEE';
            let cashImpactMultiplier = 1;

            if (typeStr === 'DEPOSIT' || typeStr === 'TRANSFER_IN') {
                mappedType = 'DEPOSIT';
                cashImpactMultiplier = 1;
                symbol = 'CASH';
            } else if (typeStr === 'WITHDRAWAL' || typeStr === 'TRANSFER_OUT') {
                mappedType = 'WITHDRAWAL';
                cashImpactMultiplier = -1;
                symbol = 'CASH';
            } else if (typeStr === 'BUY') {
                mappedType = 'BUY';
                cashImpactMultiplier = -1;
            } else if (typeStr === 'SELL') {
                mappedType = 'SELL';
                cashImpactMultiplier = 1;
            } else if (typeStr === 'DIVIDENDS') {
                mappedType = 'DIVIDEND';
                cashImpactMultiplier = 1;
            } else if (typeStr === 'FEES' || typeStr === 'TAXES') {
                mappedType = 'FEE';
                cashImpactMultiplier = -1;
            } else {
                return; // Skip unknown
            }

            const currency = (t.currencyCode || t.amount?.['@_currency'] || sec?.currencyCode || 'EUR').toUpperCase();
            const priceVal = (sharesVal > 0) ? (amountVal / sharesVal) : 0;

            const description = sec?.name || '';

            allTransactions.push({
                id: uuid,
                type: mappedType,
                date: new Date(dateStr).toISOString(),
                symbol,
                quantity: sharesVal,
                amount: amountVal * cashImpactMultiplier,
                price: priceVal,
                currency,
                account: accountName,
                source: 'PP',
                description
            });
        };

        // 1. Process Portfolio Transactions (CRITICAL for Shares/Securities)
        const portfolios = Array.isArray(client.portfolios?.portfolio) ? client.portfolios.portfolio : (client.portfolios?.portfolio ? [client.portfolios.portfolio] : []);
        portfolios.forEach((pEntry: any, pIdx: number) => {
            let p = pEntry;
            const pRef = getReference(pEntry);
            if (pRef) {
                p = resolvePath(`portfolios/portfolio[${pIdx + 1}]`, pRef) || pEntry;
            }

            const pName = p.name || `Portfolio_${pIdx}`;
            const pBasePath = objectToPath.get(p) || `portfolios/portfolio[${pIdx + 1}]`;
            
            const txObj = p.transactions;
            const txList = Array.isArray(txObj?.['portfolio-transaction'])
                ? txObj['portfolio-transaction']
                : (txObj?.['portfolio-transaction'] ? [txObj['portfolio-transaction']] : []);

            txList.forEach((txEntry: any, txIdx: number) => {
                const txPath = `${pBasePath}/transactions/portfolio-transaction[${txIdx + 1}]`;
                // Find associated account name from crossEntry if possible
                let accName = pName;
                const cross = txEntry.crossEntry;
                if (cross && cross.account) {
                    const accRef = getReference(cross.account);
                    if (accRef) {
                        const resolvedAcc = resolvePath(`${txPath}/crossEntry/account`, accRef);
                        if (resolvedAcc && resolvedAcc.name) accName = resolvedAcc.name;
                    }
                }
                processTransaction(txEntry, txPath, accName);
            });
        });

        // 2. Process Account Transactions
        const accounts = Array.isArray(client.accounts?.account) ? client.accounts.account : (client.accounts?.account ? [client.accounts.account] : []);
        accounts.forEach((acc: any, accIdx: number) => {
            const accountName = acc.name || `Account_${accIdx}`;
            const accBasePath = `accounts/account[${accIdx + 1}]/transactions`;
            const txList = Array.isArray(acc.transactions?.['account-transaction'])
                ? acc.transactions['account-transaction']
                : (acc.transactions?.['account-transaction'] ? [acc.transactions['account-transaction']] : []);

            txList.forEach((txEntry: any, txIdx: number) => {
                processTransaction(txEntry, `${accBasePath}/account-transaction[${txIdx + 1}]`, accountName);
            });
        });

        return allTransactions;
    } catch (e) {
        console.error("Failed to parse Portfolio Performance XML:", e);
        return [];
    }
}
