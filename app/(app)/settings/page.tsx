import { SettingsStore } from '../../../lib/core/persistence/settings-store';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
    const settings = SettingsStore.load();
    
    return (
        <SettingsClient initialSettings={settings} />
    );
}
