import React from 'react';
import { SettingsStore } from '../../lib/core/persistence/settings-store';
import AppLayoutClient from '../../components/layout/AppLayoutClient';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const settings = SettingsStore.load();

    return (
        <AppLayoutClient initialSettings={settings}>
            {children}
        </AppLayoutClient>
    );
}
