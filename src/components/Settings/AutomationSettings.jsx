import { useEffect, useState } from 'react';
import { Clock, Loader, CheckCircle, XCircle, Save } from 'lucide-react';
import configService from '../../services/config.service';

const AutomationSettings = () => {
    const [values, setValues] = useState({
        reminder_days_before: 2,
        post_tour_days_after: 0,
        google_review_link: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const cfg = await configService.getEmailAutomation();
                setValues(v => ({
                    reminder_days_before: cfg.reminder_days_before ?? v.reminder_days_before,
                    post_tour_days_after: cfg.post_tour_days_after ?? v.post_tour_days_after,
                    google_review_link: cfg.google_review_link ?? v.google_review_link
                }));
            } catch {
                // leave defaults; save will still work once the server is reachable
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await Promise.all([
                configService.updateConfigValue('email_automation', 'reminder_days_before', Number(values.reminder_days_before)),
                configService.updateConfigValue('email_automation', 'post_tour_days_after', Number(values.post_tour_days_after)),
                configService.updateConfigValue('email_automation', 'google_review_link', values.google_review_link.trim())
            ]);
            setMessage({ ok: true, text: 'Automation settings saved.' });
        } catch (err) {
            setMessage({ ok: false, text: err.response?.data?.message || 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-card">
                <div className="settings-card__header">
                    <Clock size={20} />
                    <h2>Scheduled Emails</h2>
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
                <Clock size={20} />
                <h2>Scheduled Emails</h2>
            </div>

            {message && (
                <div className={`settings-banner settings-banner--${message.ok ? 'success' : 'error'}`}>
                    {message.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="settings-card__body">
                <div className="settings-fields">
                    <div className="settings-field">
                        <label htmlFor="reminder_days_before">Reminder — days before the tour</label>
                        <input
                            id="reminder_days_before"
                            type="number"
                            min="0"
                            max="30"
                            value={values.reminder_days_before}
                            onChange={(e) => setValues(v => ({ ...v, reminder_days_before: e.target.value }))}
                        />
                        <span className="settings-field__hint">
                            A reminder draft is created once per group, this many days before the tour.
                        </span>
                    </div>

                    <div className="settings-field">
                        <label htmlFor="post_tour_days_after">Thank-you — days after the tour</label>
                        <input
                            id="post_tour_days_after"
                            type="number"
                            min="0"
                            max="14"
                            value={values.post_tour_days_after}
                            onChange={(e) => setValues(v => ({ ...v, post_tour_days_after: e.target.value }))}
                        />
                        <span className="settings-field__hint">
                            0 sends the draft on the same day, once the tour's end time has passed.
                        </span>
                    </div>

                    <div className="settings-field">
                        <label htmlFor="google_review_link">Google review link (optional)</label>
                        <input
                            id="google_review_link"
                            type="url"
                            placeholder="https://g.page/…"
                            value={values.google_review_link}
                            onChange={(e) => setValues(v => ({ ...v, google_review_link: e.target.value }))}
                            dir="ltr"
                        />
                        <span className="settings-field__hint">
                            Included in the post-tour thank-you email. Leave empty to omit the review request.
                        </span>
                    </div>
                </div>

                <div className="settings-card__actions">
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader size={15} className="spin" /> : <Save size={15} />}
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutomationSettings;
