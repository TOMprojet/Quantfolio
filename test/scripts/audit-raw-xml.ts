// @ts-nocheck

import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const xmlContent = fs.readFileSync('c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/portfolio-performance-source.xml', 'utf8');
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ""
});
const jObj = parser.parse(xmlContent);

const accounts = jObj.client.accounts.account;
if (!Array.isArray(accounts)) {
    console.log("No accounts found or single account not handled");
    process.exit(1);
}

const PP_PRECISION = 100; // Based on earlier findings, amount 150000 = 1500.00

accounts.forEach(acc => {
    console.log(`\nAccount: ${acc.name}`);
    let deposits = 0;
    let dividends = 0;
    let buys = 0;
    let sells = 0;

    const txs = acc.transactions?.['account-transaction'];
    if (!txs) return;

    const rawTxs = Array.isArray(txs) ? txs : [txs];

    rawTxs.forEach(t => {
        // Skip references
        if (t.reference) return;

        const amount = (t.amount || 0) / PP_PRECISION;
        const type = t.type;

        if (type === 'DEPOSIT') {
            deposits += amount;
            // console.log(`  [DEPOSIT] ${t.date} | ${amount}`);
        } else if (type === 'DIVIDENDS') {
            dividends += amount;
            // console.log(`  [DIVIDEND] ${t.date} | ${amount}`);
        } else if (type === 'BUY') {
            buys += amount;
        } else if (type === 'SELL') {
            sells += amount;
        }
    });

    console.log(`  Total DEPOSIT:   ${deposits.toFixed(2)}`);
    console.log(`  Total DIVIDENDS: ${dividends.toFixed(2)}`);
});
