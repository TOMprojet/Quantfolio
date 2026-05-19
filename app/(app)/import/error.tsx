'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong!</h2>
            <div className="bg-black/30 p-4 rounded-lg text-left font-mono text-sm text-red-200 mb-6 overflow-auto max-w-2xl">
                {error.message}
                {error.stack && <pre className="mt-2 text-xs opacity-50">{error.stack}</pre>}
            </div>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
                Try again
            </button>
        </div>
    );
}
