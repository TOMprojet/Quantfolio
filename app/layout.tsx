import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Invest Portfolio Dashboard',
    description: 'Track your investments',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: `
                    (function() {
                        function handleError(e) {
                            var isExt = (e.filename && e.filename.indexOf('chrome-extension://') !== -1) ||
                                        (e.message && e.message.toLowerCase().indexOf('metamask') !== -1) ||
                                        (e.error && e.error.stack && e.error.stack.indexOf('chrome-extension://') !== -1) ||
                                        (e.error && e.error.message && e.error.message.toLowerCase().indexOf('metamask') !== -1);
                            if (isExt) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }
                        function handleRej(e) {
                            var msg = (e.reason && e.reason.message) || String(e.reason || '');
                            var stack = (e.reason && e.reason.stack) || '';
                            var isExt = msg.toLowerCase().indexOf('metamask') !== -1 || stack.indexOf('chrome-extension://') !== -1;
                            if (isExt) {
                                e.preventDefault();
                                e.stopPropagation();
                            }
                        }
                        window.addEventListener('error', handleError, true);
                        window.addEventListener('unhandledrejection', handleRej, true);
                    })();
                ` }} />
            </head>
            <body className={`${inter.className} bg-background text-foreground transition-colors duration-500`}>
                {children}
            </body>
        </html>
    );
}
