export const CHAINS = {
    ethereum: {
        id: 1,
        name: 'Ethereum',
        rpc: 'https://cloudflare-eth.com',
        symbol: 'ETH',
        coinGeckoId: 'ethereum',
        explorerApi: 'https://eth.blockscout.com/api'
    },
    bsc: {
        id: 56,
        name: 'BSC',
        rpc: 'https://bsc-dataseed.binance.org/',
        symbol: 'BNB',
        coinGeckoId: 'binancecoin',
        explorerApi: 'https://api.bscscan.com/api' // BSC Scan might still be best or need generic
    },
    base: {
        id: 8453,
        name: 'Base',
        rpc: 'https://mainnet.base.org',
        symbol: 'ETH',
        coinGeckoId: 'ethereum',
        blockscoutUrl: 'https://base.blockscout.com',
        explorerApi: 'https://base.blockscout.com/api'
    },
    polygon: {
        id: 137,
        name: 'Polygon',
        rpc: 'https://polygon-rpc.com',
        symbol: 'MATIC',
        coinGeckoId: 'matic-network',
        blockscoutUrl: 'https://polygon.blockscout.com',
        explorerApi: 'https://polygon.blockscout.com/api'
    },
    optimism: {
        id: 10,
        name: 'Optimism',
        rpc: 'https://mainnet.optimism.io',
        symbol: 'ETH',
        coinGeckoId: 'ethereum',
        blockscoutUrl: 'https://optimism.blockscout.com',
        explorerApi: 'https://optimism.blockscout.com/api'
    },
    arbitrum: {
        id: 42161,
        name: 'Arbitrum',
        rpc: 'https://arb1.arbitrum.io/rpc',
        symbol: 'ETH',
        coinGeckoId: 'ethereum',
        blockscoutUrl: 'https://arbitrum.blockscout.com',
        explorerApi: 'https://arbitrum.blockscout.com/api'
    }
} as const;
