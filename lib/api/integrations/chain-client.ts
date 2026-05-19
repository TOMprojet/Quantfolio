
import { CHAINS } from '../config/chains';
import { isScam } from '../../config/blacklist';

export class ChainClient {

    // Generic Native Balance (ETH, BNB, MATIC depending on RPC)
    async getNativeBalance(address: string, chain: keyof typeof CHAINS): Promise<number> {
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) return 0;
        const rpc = CHAINS[chain].rpc;

        try {
            const res = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_getBalance",
                    params: [address, "latest"],
                    id: 1
                })
            });

            const json = await res.json();
            if (json.result) {
                const wei = BigInt(json.result);
                return Number(wei) / 1e18;
            }
            return 0;
        } catch (e) {
            console.error(`${chain} Native Fetch Error`, e);
            return 0;
        }
    }

    // Keep legacy for compat if needed, or redirect
    async getEthBalance(address: string): Promise<number> {
        return this.getNativeBalance(address, 'ethereum');
    }

    async getBtcBalance(address: string): Promise<number> {
        if (address.length < 26) return 0;
        try {
            const res = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
            if (!res.ok) return 0;
            const text = await res.text();
            const satoshis = parseInt(text);
            if (isNaN(satoshis)) return 0;
            return satoshis / 1e8;
        } catch (e) {
            return 0;
        }
    }

    async getERC20Balance(walletAddress: string, tokenAddress: string, chain: keyof typeof CHAINS, decimals: number = 18): Promise<number> {
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) return 0;
        const rpc = CHAINS[chain].rpc;

        // Function signature for balanceOf(address) is 70a08231
        // Pad address to 32 bytes (64 hex chars)
        const paddedAddress = walletAddress.replace('0x', '').padStart(64, '0');
        const data = `0x70a08231${paddedAddress}`;

        try {
            const res = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "eth_call",
                    params: [{
                        to: tokenAddress,
                        data: data
                    }, "latest"],
                    id: 1
                })
            });

            const json = await res.json();
            if (json.result && json.result !== '0x') {
                const raw = BigInt(json.result);
                return Number(raw) / Math.pow(10, decimals);
            }
            return 0;
        } catch (e) {
            console.error(`${chain} Token Fetch Error`, e);
            return 0;
        }
    }

    async getTokensForAddress(address: string, chain: keyof typeof CHAINS): Promise<Array<{ symbol: string, balance: number, decimals: number, contractAddress: string }>> {
        const config = CHAINS[chain];
        // @ts-ignore
        if (!config.blockscoutUrl) return [];

        try {
            // Blockscout API: ?module=account&action=tokenlist&address={address}
            // @ts-ignore
            const url = `${config.blockscoutUrl}/api?module=account&action=tokenlist&address=${address}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json.status === '1' && Array.isArray(json.result)) {
                return json.result.map((t: any) => ({
                    symbol: t.symbol,
                    balance: parseFloat(t.balance) / Math.pow(10, parseInt(t.decimals)),
                    decimals: parseInt(t.decimals),
                    contractAddress: t.contractAddress
                })).filter((t: any) => t.balance > 0);
            }
            return [];
        } catch (e) {
            console.error(`[Blockscout] Error fetching tokens for ${chain}:`, e);
            return [];
        }
    }
    async getTransactionHistory(address: string): Promise<any[]> {
        const isEvm = address.match(/^0x[a-fA-F0-9]{40}$/);
        const isBtc = address.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/);

        if (!isEvm && !isBtc) return [];

        // BITCOIN LOGIC
        if (isBtc) {
            try {
                // Fetch UTXOs or TXS from mempool.space
                const res = await fetch(`https://mempool.space/api/address/${address}/txs`);
                if (!res.ok) return [];
                const txs = await res.json();
                console.log(`[ChainClient] BTC Response: Found ${Array.isArray(txs) ? txs.length : 'INVALID'} raw transactions.`);

                return txs.map((t: any) => {
                    // Simple parsing for BTC transactions
                    // Determine if IN or OUT
                    // This is complex for UTXO, strictly speaking we just need BALANCE for now?
                    // User wants "History" for performance.
                    // For now, let's look at net changes per tx.

                    const myInput = t.vin.find((i: any) => i.prevout?.scriptpubkey_address === address);
                    const myOutput = t.vout.find((o: any) => o.scriptpubkey_address === address);

                    let quantity = 0;
                    let type = 'TRANSFER';
                    let price = 0; // We will backfill later

                    // Simple heuristic: 
                    // If I am in inputs, I spent. (SELL/SEND)
                    // If I am in outputs, I received. (BUY/RECEIVE)

                    if (myInput) {
                        type = 'SELL'; // Spending
                        quantity = -(myInput.prevout.value / 100000000); // Satoshis to BTC
                    } else if (myOutput) {
                        type = 'BUY'; // Receiving
                        quantity = (myOutput.value / 100000000);
                    }

                    return {
                        date: new Date(t.status.block_time * 1000),
                        type: type,
                        symbol: 'BTC',
                        quantity: Math.abs(quantity),
                        price: 0, // Will be backfilled
                        decimals: 8,
                        hash: t.txid
                    };
                });
            } catch (e) {
                console.error('[ChainClient] BTC Fetch Error', e);
                return [];
            }
        }

        const allTxs: any[] = [];
        const chains = Object.keys(CHAINS) as (keyof typeof CHAINS)[];

        // Rate limit helper
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        const validChains = chains.filter(c => CHAINS[c].explorerApi);

        const results = await Promise.all(validChains.map(async (chain) => {
            const config = CHAINS[chain];
            const chainTxs: any[] = [];

            try {
                // 1. Native Transactions
                // @ts-ignore
                const nativeUrl = `${config.explorerApi}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc`;

                let nativeRes: any = { status: '0', result: [] };
                try {
                    const r = await fetch(nativeUrl);
                    const text = await r.text();
                    try {
                        nativeRes = JSON.parse(text);
                    } catch (e) {
                        console.warn(`[ChainClient] Invalid JSON from ${chain}: ${text.substring(0, 50)}...`);
                    }
                } catch (e) {
                    console.warn(`[ChainClient] Network Error ${chain}`, e);
                }

                if (nativeRes.status === '1' && Array.isArray(nativeRes.result)) {
                    nativeRes.result.forEach((tx: any) => {
                        if (tx.isError === '1') return;

                        const val = parseFloat(tx.value) / 1e18;
                        const fee = (parseFloat(tx.gasUsed) * parseFloat(tx.gasPrice)) / 1e18;
                        const date = new Date(parseInt(tx.timeStamp) * 1000);

                        if (tx.to.toLowerCase() === address.toLowerCase()) {
                            if (val > 0) {
                                chainTxs.push({
                                    date,
                                    type: 'BUY',
                                    symbol: config.symbol === 'ETH' ? 'ETH-USD' : `${config.symbol}-USD`,
                                    quantity: val,
                                    price: 0,
                                    amount: 0,
                                    currency: 'EUR'
                                });
                            }
                        } else if (tx.from.toLowerCase() === address.toLowerCase()) {
                            // OUT (Sell/Withdrawal/Spend)
                            const totalOut = val + fee; // Basic logic
                            chainTxs.push({
                                date,
                                type: 'SELL',
                                symbol: config.symbol === 'ETH' ? 'ETH-USD' : `${config.symbol}-USD`,
                                quantity: val,
                                price: 0,
                                amount: 0,
                                currency: 'EUR'
                            });
                        }
                    });
                }

                // 2. Token Transactions
                // @ts-ignore
                const tokenUrl = `${config.explorerApi}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=asc`;
                const tokenRes = await fetch(tokenUrl).then(r => r.json());

                if (tokenRes.status === '1' && Array.isArray(tokenRes.result)) {
                    tokenRes.result.forEach((tx: any) => {
                        let symbol = tx.tokenSymbol;
                        if (isScam(symbol)) return;

                        const decimals = parseInt(tx.tokenDecimal);
                        const val = parseFloat(tx.value) / Math.pow(10, decimals);
                        const date = new Date(parseInt(tx.timeStamp) * 1000);

                        if (symbol === 'WETH') symbol = 'ETH';

                        if (tx.to.toLowerCase() === address.toLowerCase()) {
                            chainTxs.push({
                                date,
                                type: 'BUY',
                                symbol: symbol,
                                quantity: val,
                                price: 0,
                                amount: 0,
                                currency: 'EUR'
                            });
                        } else if (tx.from.toLowerCase() === address.toLowerCase()) {
                            chainTxs.push({
                                date,
                                type: 'SELL',
                                symbol: symbol,
                                quantity: val,
                                price: 0,
                                amount: 0,
                                currency: 'EUR'
                            });
                        }
                    });
                }

            } catch (e) {
                console.error(`[ChainClient] Failed ${chain}`, e);
            }
            return chainTxs;
        }));

        return results.flat();

        return allTxs;
    }
}
