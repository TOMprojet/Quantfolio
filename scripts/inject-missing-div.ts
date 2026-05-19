
import fs from 'fs';

const path = 'c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/portfolio-performance-source.xml';
const content = fs.readFileSync(path, 'utf8');

const marker = '<name>Espèces PEA</name>';
const index = content.indexOf(marker);

if (index === -1) {
    console.error('Marker "Espèces PEA" not found');
    process.exit(1);
}

const txMarker = '<transactions>';
const txIndex = content.indexOf(txMarker, index);

if (txIndex === -1) {
    console.error('Transactions marker not found for Espèces PEA');
    process.exit(1);
}

const insertPoint = txIndex + txMarker.length;
const divXml = `
                <account-transaction>
                  <uuid>b${Math.random().toString(36).substring(2, 11)}</uuid>
                  <date>2025-10-23T00:00</date>
                  <currencyCode>EUR</currencyCode>
                  <amount>408</amount>
                  <security reference="../../../securities/security[uuid='ba355029-8d20-4264-b96c-66bd5190d2fa']"/>
                  <type>DIVIDENDS</type>
                </account-transaction>`;

const newContent = content.slice(0, insertPoint) + divXml + content.slice(insertPoint);
fs.writeFileSync(path, newContent);
console.log('Successfully injected ASML dividend info PEA XML.');
