// @ts-nocheck

import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const PP_XML = 'c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/portfolio-performance-source.xml';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function auditPPDeposits() {
    const xml = fs.readFileSync(PP_XML, 'utf8');
    const obj = parser.parse(xml);
    const accounts = Array.isArray(obj.client.accounts.account) ? obj.client.accounts.account : [obj.client.accounts.account];

    accounts.forEach(acc => {
        if (!acc.name.includes("Espèces PEA")) return;

        const txs = acc.transactions?.['account-transaction'];
        if (!txs) return;
        const txList = Array.isArray(txs) ? txs : [txs];

        txList.forEach(t => {
            if (t.reference) return;
            const amount = (t.amount || 0) / 100;
            if (t.type === 'DEPOSIT') {
                console.log(`${t.date} | ${amount.toFixed(2)} | ${acc.name}`);
            }
        });
    });
}

auditPPDeposits();
