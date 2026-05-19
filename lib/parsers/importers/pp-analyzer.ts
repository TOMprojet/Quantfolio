import { XMLParser } from 'fast-xml-parser';

export interface PpAccount {
    name: string;
    uuid: string;
    type: 'deposit' | 'securities' | 'portfolio';
}

export function analyzePpXml(xmlContent: string): PpAccount[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: ""
    });

    try {
        const result = parser.parse(xmlContent);
        const client = result.client;
        if (!client) return [];

        const accounts: PpAccount[] = [];
        const seenUuids = new Set<string>();

        const walk = (obj: any, context: string = '') => {
            if (!obj || typeof obj !== 'object') return;

            if (obj.name && obj.uuid && !seenUuids.has(obj.uuid)) {
                // Heuristic to identify accounts/portfolios
                // In PP, these tags are named 'account', 'securities-account', or 'portfolio'
                const isFound = ['account', 'securities-account', 'portfolio'].includes(context);
                if (isFound) {
                    accounts.push({
                        name: obj.name,
                        uuid: obj.uuid,
                        type: context as any
                    });
                    seenUuids.add(obj.uuid);
                }
            }

            for (const key in obj) {
                const val = obj[key];
                if (Array.isArray(val)) {
                    val.forEach(item => walk(item, key));
                } else {
                    walk(val, key);
                }
            }
        };

        walk(client);
        return accounts;
    } catch (e) {
        console.error('[PP-ANALYZER] Error:', e);
        return [];
    }
}
