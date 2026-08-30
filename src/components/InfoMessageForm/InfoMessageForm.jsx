import React, { useState, useEffect } from 'react';
import configService from '../../services/config.service';
import { X } from 'lucide-react';

const InfoMessageForm = ({ message, onSave, onDelete, onCancel }) => {
    const [formData, setFormData] = useState({
        text: '',
        date: new Date().toLocaleDateString('en-CA'),
        startTime: '10:00',
        endTime: '11:00',
        allDay: false,
        isRecurring: false,
        recurringType: 'none',
        type: 'General Info',
        type_is_other: false
    });

    const [types, setTypes] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        const loadTypes = async () => {
            try {
                const fetchedTypes = await configService.getInfoMessageTypes();
                setTypes(fetchedTypes);
            } catch (err) {
                console.error('Failed to load info message types:', err);
                setTypes([
                    { id: 'info', label: 'General Info' },
                    { id: 'holiday', label: 'Holiday' },
                    { id: 'maintenance', label: 'Maintenance' },
                    { id: 'staff', label: 'Staff Out' }
                ]);
            }
        };
        loadTypes();
    }, []);
    useEffect(() => {
        if (message && types.length > 0) {
            // Check if the current type is one of the pre-defined ones (check both ID and Label)
            const typeConfig = types.find(t => t.label === message.type || t.id === message.type);
            const isOther = message.type && !typeConfig;
            
            setFormData(prev => ({
                ...prev,
                ...message,
                _id: message._id,
                type_is_other: isOther,
                type: isOther ? 'Other' : (typeConfig?.label || 'General Info'),
                customType: isOther ? message.type : ''
            }));
        }
    }, [message, types]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.text) {
            alert('Message text is required');
            return;
        }

        const dataToSave = { ...formData };
        
        // If 'Other' is selected, use the custom text as the type
        if (formData.type === 'Other') {
            dataToSave.type = formData.customType || 'Other';
        }
        
        // Clean up UI-only state before sending to API
        delete dataToSave.type_is_other;
        delete dataToSave.customType;
        delete dataToSave.isInfoMessage;
        delete dataToSave.resolvedColor;

        onSave(dataToSave);
    };

    return (
        <div className="tour-form-overlay" onClick={onCancel}>
            <div className="tour-form-modal robust-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <header className="modal-header">
                    <div className="flex-between">
                        <h2>{message && message._id ? 'Edit Info Message' : 'New Info Message'}</h2>
                        <button className="btn-close" onClick={onCancel}>
                            <X size={24} />
                        </button>
                    </div>
                </header>

                <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
                    <div className="form-group">
                        <label htmlFor="text">Message Text <span className="required-star">*</span></label>
                        <textarea 
                            id="text" 
                            name="text" 
                            value={formData.text} 
                            onChange={handleChange} 
                            required 
                            rows="3"
                            placeholder="e.g. US Independence Day or Maintenance Work"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="date">Date <span className="required-star">*</span></label>
                            <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="type">Category</label>
                            <select 
                                id="type" 
                                name="type" 
                                value={formData.type} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                        setFormData(prev => ({ ...prev, type: 'Other', type_is_other: true }));
                                    } else {
                                        setFormData(prev => ({ ...prev, type: val, type_is_other: false }));
                                    }
                                }}
                            >
                                {types.map(t => (
                                    <option key={t.id} value={t.label}>{t.label}</option>
                                ))}
                                <option value="Other">Other (custom)</option>
                            </select>
                        </div>
                    </div>

                    {formData.type_is_other && (
                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label htmlFor="customType">Custom Category Label</label>
                            <input 
                                id="customType" 
                                type="text" 
                                name="customType" 
                                value={formData.customType || ''} 
                                onChange={handleChange} 
                                placeholder="Enter custom category..." 
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    <div className="form-row" style={{ alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                        <label className="checkbox-label" style={{ margin: 0 }}>
                            <input type="checkbox" name="allDay" checked={formData.allDay} onChange={handleChange} />
                            <span>All Day</span>
                        </label>
                    </div>

                    {!formData.allDay && (
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="startTime">Start Time</label>
                                <input id="startTime" type="time" step="900" name="startTime" value={formData.startTime} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="endTime">End Time</label>
                                <input id="endTime" type="time" step="900" name="endTime" value={formData.endTime} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    <div className="form-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <label className="checkbox-label">
                            <input type="checkbox" name="isRecurring" checked={formData.isRecurring} onChange={handleChange} />
                            <span>Recurring Event</span>
                        </label>

                        {formData.isRecurring && (
                            <div className="form-group" style={{ marginTop: '10px' }}>
                                <label htmlFor="recurringType">Repeat Interval</label>
                                <select id="recurringType" name="recurringType" value={formData.recurringType} onChange={handleChange}>
                                    <option value="none">Select...</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <footer className="modal-footer flex-between" style={{ marginTop: '30px' }}>
                        <div className="left">
                            {message && message._id && (
                                showDeleteConfirm ? (
                                    <div className="delete-confirm" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>Are you sure?</span>
                                        <button
                                            type="button"
                                            className="btn-danger"
                                            onClick={() => onDelete(message._id)}
                                            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="btn-danger" 
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        Delete
                                    </button>
                                )
                            )}
                        </div>
                        <div className="right flex-center" style={{ gap: '10px' }}>
                            <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="btn-primary">Save Message</button>
                        </div>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default InfoMessageForm;
