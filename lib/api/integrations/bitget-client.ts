import crypto from 'crypto';

interface BitgetAsset {
    coin: string;
    available: string;
    frozen: string;
    locked: string;
}

export class BitgetClient {
    private baseUrl = 'https://api.bitget.com';

    private sign(timestamp: string, method: string, requestPath: string, queryString: string, body: string, secretKey: string) {
        let message = timestamp + method.toUpperCase() + requestPath;
        if (queryString) {
            message += '?' + queryString;
        }
        if (body) {
            message += body;
        }

        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(message);
        return hmac.digest('base64');
    }

    async getSpotAssets(apiKey: string, secretKey: string, passphrase: string) {
        const path = '/api/v2/spot/account/assets';
        const method = 'GET';
        const timestamp = Date.now().toString();

        const signature = this.sign(timestamp, method, path, '', '', secretKey);

        const headers = {
            'ACCESS-KEY': apiKey,
            'ACCESS-SIGN': signature,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json',
            'locale': 'en-US'
        };

        try {
            const res = await fetch(`${this.baseUrl}${path}`, { headers });
            if (!res.ok) {
                console.error(`Bitget API Error: ${res.status} ${res.statusText}`);
                return [];
            }
            const json = await res.json();

            if (json.code !== '00000') {
                console.error(`Bitget Logic Error: ${json.msg}`);
                return [];
            }

            return (json.data as BitgetAsset[]) || [];
        } catch (e) {
            console.error('Bitget Fetch Error', e);
            return [];
        }
    }
}
