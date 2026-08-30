import React from 'react';

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        TIME_OPTIONS.push(`${hh}:${mm}`);
    }
}

const TimeSelect = ({ id, name, value, onChange, required, disabled, className = '' }) => {
    const normalizedValue = value || '';
    const isCustomTime = normalizedValue && !TIME_OPTIONS.includes(normalizedValue);

    return (
        <select
            id={id}
            name={name}
            value={normalizedValue}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className={`time-select ${className}`}
        >
            {isCustomTime && (
                <option value={normalizedValue}>{normalizedValue}</option>
            )}
            {TIME_OPTIONS.map(t => (
                <option key={t} value={t}>{t}</option>
            ))}
        </select>
    );
};

export default TimeSelect;
