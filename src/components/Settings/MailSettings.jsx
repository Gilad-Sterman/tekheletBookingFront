import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Loader, ExternalLink, Trash2, FlaskConical, RefreshCw } from 'lucide-react';
import { mailService } from '../../services/api.service';

const MailSettings = ({ highlightConnected }) => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    // Show a brief success banner when redirected back from OAuth
    useEffect(() => {
        if (highlightConnected) {
            const timer = setTimeout(() => setTestResult(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [highlightConnected]);

    const fetchStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await mailService.getStatus();
            setStatus(data);
        } catch {
            setError('Failed to load mail status.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        window.location.href = mailService.getConnectUrl();
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Disconnect the mailbox? Automation will stop sending emails until reconnected.')) return;
        setActionLoading(true);
        setError(null);
        try {
            await mailService.disconnect();
            setStatus({ connected: false });
            setTestResult(null);
        } catch {
            setError('Failed to disconnect mailbox.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleTest = async () => {
        setActionLoading(true);
        setTestResult(null);
        setError(null);
        try {
            await mailService.sendTest();
            setTestResult({ ok: true, message: 'Test email sent — check the Tours/Connectivity Test folder in the connected mailbox.' });
        } catch (err) {
            setTestResult({ ok: false, message: err.response?.data?.error || 'Test failed.' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSweep = async () => {
        setActionLoading(true);
        setTestResult(null);
        setError(null);
        try {
            const { swept, total } = await mailService.sweep();
            const msg = total === 0
                ? 'No pending drafts to file.'
                : swept === 0
                    ? `${total} draft(s) checked — none have been sent yet.`
                    : `${swept} of ${total} sent draft(s) filed into their group folders.`;
            setTestResult({ ok: true, message: msg });
        } catch (err) {
            setTestResult({ ok: false, message: err.response?.data?.error || 'Sweep failed.' });
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="settings-card">
                <div className="settings-card__header">
                    <Mail size={20} />
                    <h2>Email Automation</h2>
                </div>
                <div className="settings-card__loading">
                    <Loader size={18} className="spin" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-card">
            <div className="settings-card__header">
                <Mail size={20} />
                <h2>Email Automation</h2>
            </div>

            {highlightConnected && status?.connected && (
                <div className="settings-banner settings-banner--success">
                    <CheckCircle size={16} />
                    Mailbox connected successfully: <strong>{status.email}</strong>
                </div>
            )}

            {error && (
                <div className="settings-banner settings-banner--error">
                    <XCircle size={16} />
                    {error}
                </div>
            )}

            {testResult && (
                <div className={`settings-banner settings-banner--${testResult.ok ? 'success' : 'error'}`}>
                    {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {testResult.message}
                </div>
            )}

            <div className="settings-card__body">
                {status?.connected ? (
                    <>
                        <div className="mail-status mail-status--connected">
                            <CheckCircle size={18} className="mail-status__icon" />
                            <div className="mail-status__info">
                                <span className="mail-status__email">{status.email}</span>
                                {status.connectedAt && (
                                    <span className="mail-status__meta">Connected {formatDate(status.connectedAt)}</span>
                                )}
                            </div>
                        </div>

                        <p className="settings-card__description">
                            Automated emails (booking confirmations, reschedules, cancellations)
                            are sent as drafts from this mailbox. Coordinators review and send them manually.
                        </p>

                        <div className="settings-card__actions">
                            <button
                                className="btn-secondary"
                                onClick={handleSweep}
                                disabled={actionLoading}
                                title="Check for manually-sent drafts and file them into their group folders"
                            >
                                {actionLoading ? <Loader size={15} className="spin" /> : <RefreshCw size={15} />}
                                File Sent Drafts
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={handleTest}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <Loader size={15} className="spin" /> : <FlaskConical size={15} />}
                                Send Test Email
                            </button>
                            <button
                                className="btn-danger"
                                onClick={handleDisconnect}
                                disabled={actionLoading}
                            >
                                <Trash2 size={15} />
                                Disconnect
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mail-status mail-status--disconnected">
                            <XCircle size={18} className="mail-status__icon" />
                            <span>No mailbox connected</span>
                        </div>

                        <p className="settings-card__description">
                            Connect an Outlook / Microsoft 365 mailbox to enable email automation.
                            You will be asked to sign in with Microsoft and grant mail permissions.
                        </p>

                        <div className="settings-card__actions">
                            <button className="btn-primary" onClick={handleConnect}>
                                <ExternalLink size={15} />
                                Connect Outlook Mailbox
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default MailSettings;
