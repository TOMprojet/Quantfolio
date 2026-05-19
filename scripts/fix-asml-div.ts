
import fs from 'fs';

const path = 'c:/Users/Tom/.gemini/antigravity/scratch/Quantfolio_Import/Quantfolio/private/portfolio-performance-source.xml';
let content = fs.readFileSync(path, 'utf8');

// Find the ASML security UUID to ensure it exists
const asmlUuid = 'ba355029-8d20-4264-b96c-66bd5190d2fa';
if (!content.includes(asmlUuid)) {
    console.error('ASML UUID not found in XML');
    process.exit(1);
}

const marker = '<name>Espèces PEA</name>';
const nameIdx = content.indexOf(marker);
if (nameIdx === -1) {
    console.error('Account "Espèces PEA" not found');
    process.exit(1);
}

const txListStart = content.indexOf('<account-transaction>', nameIdx);
if (txListStart === -1) {
    console.error('Account transactions list not found');
    process.exit(1);
}

const divXml = `
                <account-transaction>
                  <uuid>bFixedASMLDiv2025</uuid>
                  <date>2025-10-23T00:00</date>
                  <currencyCode>EUR</currencyCode>
                  <amount>408</amount>
                  <security reference="../../../securities/security[uuid='${asmlUuid}']"/>
                  <type>DIVIDENDS</type>
                </account-transaction>
                `;

const newContent = content.slice(0, txListStart) + divXml + content.slice(txListStart);
fs.writeFileSync(path, newContent);
console.log('Successfully re-injected ASML dividend into the correct transactions list.');
