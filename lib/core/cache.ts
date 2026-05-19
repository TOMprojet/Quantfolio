// Cache Utility
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

interface CacheStore {
    [key: string]: {
        timestamp: number;
        data: any;
    }
}

// Memory Singleton to avoid disk I/O within the same process life
const MEMORY_CACHE: Record<string, CacheStore> = {};

function getCacheFilePath(namespace: string): string {
    return path.join(CACHE_DIR, `${namespace}-cache.json`);
}

function loadCache(namespace: string): CacheStore {
    if (MEMORY_CACHE[namespace]) return MEMORY_CACHE[namespace];

    try {
        const filePath = getCacheFilePath(namespace);
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            MEMORY_CACHE[namespace] = JSON.parse(raw);
            return MEMORY_CACHE[namespace];
        }
    } catch (e) {
        console.warn(`Failed to load cache for ${namespace}:`, e);
    }
    return {};
}

async function saveCache(namespace: string, cache: CacheStore) {
    MEMORY_CACHE[namespace] = cache;
    try {
        if (!fs.existsSync(CACHE_DIR)) {
            await fs.promises.mkdir(CACHE_DIR, { recursive: true });
        }
        const filePath = getCacheFilePath(namespace);
        await fs.promises.writeFile(filePath, JSON.stringify(cache, null, 2), 'utf-8');
    } catch (e) {
        console.warn(`Failed to save cache for ${namespace}:`, e);
    }
}

export async function fetchWithCache<T>(
    namespace: string,
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 3600
): Promise<T | null> {
    const cache = loadCache(namespace);
    const now = Date.now();
    const cachedItem = cache[key];

    if (cachedItem && cachedItem.data && cachedItem.timestamp) {
        const ageSeconds = (now - cachedItem.timestamp) / 1000;
        if (ageSeconds < ttlSeconds) {
            return cachedItem.data as T;
        }
    }

    try {
        const data = await fetcher();
        if (data) {
            const currentCache = loadCache(namespace);
            currentCache[key] = {
                timestamp: now,
                data: data
            };
            await saveCache(namespace, currentCache);
            return data;
        }
        throw new Error("Empty Response");
    } catch (e: any) {
        return cachedItem?.data || null;
    }
}

