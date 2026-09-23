import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MailSettings from './MailSettings';
import AutomationSettings from './AutomationSettings';

const Settings = () => {
    const location = useLocation();
    const [highlightConnected, setHighlightConnected] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('mailConnected')) {
            setHighlightConnected(true);
            // Clean the query param from the URL without a re-render
            window.history.replaceState({}, '', '/settings');
        }
    }, [location.search]);

    return (
        <div className="settings-page">
            <div className="settings-page__header">
                <Link to="/" className="btn-back flex-center">
                    <ArrowLeft size={18} />
                    Back to Calendar
                </Link>
                <div>
                    <h1>Settings</h1>
                    <p>Manage integrations and automation preferences</p>
                </div>
            </div>

            <div className="settings-page__content">
                <MailSettings highlightConnected={highlightConnected} />
                <AutomationSettings />
            </div>
        </div>
    );
};

export default Settings;
