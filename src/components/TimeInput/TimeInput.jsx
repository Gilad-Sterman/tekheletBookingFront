import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
        TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
}

const parseTime = (val) => {
    if (!val) return null;
    const trimmed = val.trim();

    // HH:MM or H:MM
    let match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }

    // HHMM — 4 digits, no colon (e.g. "1230" → "12:30")
    match = trimmed.match(/^(\d{2})(\d{2})$/);
    if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
    }

    return null;
};

const TimeInput = ({ id, name, value, onChange, required, disabled, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState(value || '');
    const containerRef = useRef(null);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const inputTextRef = useRef(inputText);
    inputTextRef.current = inputText;
    const touchStartY = useRef(null);

    useEffect(() => {
        setInputText(value || '');
    }, [value]);

    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const selected = listRef.current.querySelector('.time-option-selected');
        if (selected) {
            selected.scrollIntoView({ block: 'center', behavior: 'instant' });
        } else {
            listRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    const fireChange = (newVal) => {
        setInputText(newVal);
        if (newVal !== value) {
            onChange({ target: { name, value: newVal } });
        }
    };

    const commitTyped = () => {
        const parsed = parseTime(inputTextRef.current);
        if (parsed) {
            fireChange(parsed);
        } else {
            setInputText(value || '');
        }
    };

    const handleSelect = (time) => {
        fireChange(time);
        setIsOpen(false);
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitTyped();
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setInputText(value || '');
            setIsOpen(false);
        } else if (e.key === 'ArrowDown' && !isOpen) {
            setIsOpen(true);
        }
    };

    const handleInputBlur = () => {
        setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
                commitTyped();
                setIsOpen(false);
            }
        }, 150);
    };

    const handleChevronPointerDown = (e) => {
        e.preventDefault();
        if (!disabled) setIsOpen(prev => !prev);
    };

    const handleOptionMouseDown = (e, time) => {
        e.preventDefault();
        handleSelect(time);
    };

    const handleOptionTouchStart = (e) => {
        touchStartY.current = e.touches[0].clientY;
    };

    const handleOptionTouchEnd = (e, time) => {
        const delta = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
        if (delta < 8) handleSelect(time);
    };

    return (
        <div
            ref={containerRef}
            className={`time-input-wrapper ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
        >
            <input
                ref={inputRef}
                id={id}
                type="text"
                name={name}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => !disabled && setIsOpen(true)}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                required={required}
                disabled={disabled}
                placeholder="HH:MM"
                autoComplete="off"
                className="time-input-field"
            />
            <button
                type="button"
                className="time-input-chevron"
                tabIndex={-1}
                disabled={disabled}
                onPointerDown={handleChevronPointerDown}
            >
                <ChevronDown size={14} />
            </button>
            {isOpen && !disabled && (
                <ul
                    className="time-input-dropdown"
                    ref={listRef}
                    role="listbox"
                >
                    {TIME_OPTIONS.map(t => (
                        <li
                            key={t}
                            role="option"
                            aria-selected={t === value}
                            className={`time-option ${t === value ? 'time-option-selected' : ''}`}
                            onMouseDown={(e) => handleOptionMouseDown(e, t)}
                            onTouchStart={handleOptionTouchStart}
                            onTouchEnd={(e) => handleOptionTouchEnd(e, t)}
                        >
                            {t}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default TimeInput;
