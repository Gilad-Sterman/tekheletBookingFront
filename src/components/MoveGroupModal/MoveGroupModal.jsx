import React, { useState, useMemo } from 'react';
import { X, ArrowRightFromLine } from 'lucide-react';
import TimeInput from '../TimeInput/TimeInput';

const calcEndTime = (startTime, sourceTourStartTime, sourceTourEndTime) => {
    if (!startTime || !sourceTourStartTime || !sourceTourEndTime) return sourceTourEndTime || '';
    const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const duration = toMinutes(sourceTourEndTime) - toMinutes(sourceTourStartTime);
    const newEnd = toMinutes(startTime) + Math.max(duration, 0);
    return `${String(Math.floor(newEnd / 60) % 24).padStart(2, '0')}:${String(newEnd % 60).padStart(2, '0')}`;
};

const MoveGroupModal = ({ group, sourceTourId, sourceTourDate, sourceTourStartTime, sourceTourEndTime, sourceTourGroupCount, allTours, onConfirm, onCancel }) => {
    const [selectedDate, setSelectedDate] = useState(sourceTourDate || '');
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [startTime, setStartTime] = useState(sourceTourStartTime || '10:00');

    const isOnlyGroup = sourceTourGroupCount <= 1;
    const derivedEndTime = calcEndTime(startTime, sourceTourStartTime, sourceTourEndTime);

    const toursOnDate = useMemo(() => {
        if (!selectedDate) return [];
        return allTours.filter(t => t._id !== sourceTourId && t.date === selectedDate);
    }, [allTours, selectedDate, sourceTourId]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        setSelectedDestination(null);
    };

    const handleConfirm = () => {
        if (!selectedDestination || !selectedDate) return;
        onConfirm(selectedDestination, selectedDate, startTime, derivedEndTime);
    };

    return (
        <div className="move-modal-overlay" onClick={onCancel}>
            <div className="move-modal" onClick={(e) => e.stopPropagation()}>
                <div className="move-modal-header">
                    <h3>Move Group</h3>
                    <button type="button" className="btn-close" onClick={onCancel}>
                        <X size={20} />
                    </button>
                </div>

                <div className="move-modal-body">
                    {group?.name && (
                        <p className="move-group-name">"{group.name}"</p>
                    )}

                    {isOnlyGroup && (
                        <div className="move-warning">
                            ⚠️ This is the only group on this tour. Moving it will <strong>delete the original tour</strong>.
                        </div>
                    )}

                    <div className="move-date-section">
                        <label>Destination Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                        />
                    </div>

                    {selectedDate && (
                        <div className="move-tours-list">
                            <label>Select Destination</label>
                            <div className="destination-options">
                                {toursOnDate.length === 0 && (
                                    <p className="no-tours-on-date">No other tours on this date</p>
                                )}
                                {toursOnDate.map(t => (
                                    <button
                                        key={t._id}
                                        type="button"
                                        className={`destination-option ${selectedDestination === t._id ? 'selected' : ''}`}
                                        onClick={() => setSelectedDestination(t._id)}
                                    >
                                        <span className="dest-title">{t.title}</span>
                                        <span className="dest-time">{t.startTime}–{t.endTime}</span>
                                        <span className="dest-groups">
                                            {t.groups?.length || 0} grp{t.groups?.length !== 1 ? 's' : ''}
                                        </span>
                                    </button>
                                ))}
                                {toursOnDate.length > 0 && (
                                    <div className="destination-divider">— or —</div>
                                )}
                                <button
                                    type="button"
                                    className={`destination-option destination-option--new ${selectedDestination === 'new' ? 'selected' : ''}`}
                                    onClick={() => setSelectedDestination('new')}
                                >
                                    + New tour on this date
                                </button>
                            </div>

                        </div>
                    )}
                </div>

                {selectedDestination === 'new' && (
                    <div className="move-new-tour-time">
                        <label>New Tour Start Time</label>
                        <div className="move-time-row">
                            <TimeInput
                                name="startTime"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                            <span className="move-time-end">ends {derivedEndTime}</span>
                        </div>
                    </div>
                )}

                <div className="move-modal-footer">
                    <button type="button" className="btn-secondary" onClick={onCancel}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleConfirm}
                        disabled={!selectedDestination}
                    >
                        <ArrowRightFromLine size={16} />
                        Move Group
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoveGroupModal;
