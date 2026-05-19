// @ts-nocheck

import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

const PP_XML = 'c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/portfolio-performance-source.xml';
const IBKR_XML = 'c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/ibkr-flex.xml';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function auditPP() {
    console.log("--- PORTFOLIO PERFORMANCE AUDIT (PEA TARGET: 9510€) ---");
    const xml = fs.readFileSync(PP_XML, 'utf8');
    const obj = parser.parse(xml);
    const accounts = Array.isArray(obj.client.accounts.account) ? obj.client.accounts.account : [obj.client.accounts.account];

    accounts.forEach(acc => {
        if (!acc.name.includes("PEA")) return;

        let deposits = 0;
        let dividends = 0;
        const txs = acc.transactions?.['account-transaction'];
        if (!txs) return;
        const txList = Array.isArray(txs) ? txs : [txs];

        txList.forEach(t => {
            if (t.reference) return;
            const amount = (t.amount || 0) / 100;
            if (t.type === 'DEPOSIT') deposits += amount;
            if (t.type === 'DIVIDENDS') dividends += amount;
        });
        console.log(`Account: ${acc.name} | Deposits: ${deposits.toFixed(2)} | Dividends: ${dividends.toFixed(2)}`);
    });
}

function auditIBKR() {
    console.log("\n--- IBKR AUDIT (CTO TARGET: 3500€) ---");
    const xml = fs.readFileSync(IBKR_XML, 'utf8');
    const obj = parser.parse(xml);
    const stmt = obj.FlexQueryResponse.FlexStatements.FlexStatement;

    let deposits = 0;
    let dividends = 0;
    const cashTxs = stmt.CashTransactions?.CashTransaction;
    if (!cashTxs) return;
    const txList = Array.isArray(cashTxs) ? cashTxs : [cashTxs];

    txList.forEach(t => {
        const amount = parseFloat(t.amount || '0');
        const desc = (t.description || '').toLowerCase();

        if (desc.includes("cash receipts")) {
            deposits += amount;
        } else if (desc.includes("dividend") && amount > 0) {
            dividends += amount;
        }
    });

    console.log(`IBKR Deposits: ${deposits.toFixed(2)} | Net Dividends (Positive Cash): ${dividends.toFixed(2)}`);
}

auditPP();
auditIBKR();
