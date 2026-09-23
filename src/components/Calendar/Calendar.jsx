import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { tourService } from '../../services/api.service';
import { useAuth } from '../../hooks/useAuth';
import { Plus, MessageSquare, BarChart3 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import TourForm from '../TourForm/TourForm';
import InfoMessageForm from '../InfoMessageForm/InfoMessageForm';
import configService from '../../services/config.service';

const Calendar = () => {
    const { user: currentUser } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isInfoFormOpen, setIsInfoFormOpen] = useState(false);
    const [selectedTour, setSelectedTour] = useState(null);
    const [selectedInfoMessage, setSelectedInfoMessage] = useState(null);
    const [infoMessageTypes, setInfoMessageTypes] = useState([]);
    const [submitError, setSubmitError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const processEventsData = (tours, infoMessages, types) => {
        const tourEvents = tours.map(tour => {
            const end = tour.endTime ? `${tour.date}T${tour.endTime}` : null;
            return {
                id: tour._id,
                title: tour.title,
                start: tour.start,
                end: end,
                backgroundColor: tour.color || '#134869',
                extendedProps: { ...tour, type: 'tour' }
            };
        });

        const formatMessageLocal = (msg, occurrenceDate = null) => {
            const displayDate = occurrenceDate || msg.date;
            const start = msg.allDay ? displayDate : (msg.startTime ? `${displayDate}T${msg.startTime}` : displayDate);
            const end = (!msg.allDay && msg.endTime) ? `${displayDate}T${msg.endTime}` : null;
            const typeConfig = types.find(t => t.label === msg.type || t.id === msg.type);
            const eventColor = typeConfig?.color || '#475569';
            return {
                id: occurrenceDate ? `${msg._id}-${occurrenceDate}` : msg._id,
                title: msg.text,
                start: start,
                end: end,
                allDay: msg.allDay,
                backgroundColor: eventColor,
                textColor: '#ffffff',
                extendedProps: { ...msg, isInfoMessage: true, resolvedColor: eventColor }
            };
        };

        const formattedInfoEvents = [];
        infoMessages.forEach(msg => {
            if (!msg.isRecurring || msg.recurringType === 'none') {
                formattedInfoEvents.push(formatMessageLocal(msg));
            } else {
                let currentDate = new Date(msg.date);
                const expansionLimit = new Date();
                expansionLimit.setMonth(expansionLimit.getMonth() + 6);
                while (currentDate <= expansionLimit) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    formattedInfoEvents.push(formatMessageLocal(msg, dateStr));
                    if (msg.recurringType === 'daily') currentDate.setDate(currentDate.getDate() + 1);
                    else if (msg.recurringType === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                    else if (msg.recurringType === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
                    else break;
                }
            }
        });

        setEvents([...tourEvents, ...formattedInfoEvents]);

        // Deep link: auto-open tour modal from URL param
        const tourId = searchParams.get('tourId');
        if (tourId) {
            const matchedTour = tours.find(t => t._id === tourId);
            if (matchedTour) {
                setSelectedTour(matchedTour);
                setIsFormOpen(true);
            }
            setSearchParams({}, { replace: true });
        }
    };

    const loadInitialData = async () => {
        try {
            const [allUsers, types, tours, infoMessages] = await Promise.all([
                tourService.getUsers(),
                configService.getInfoMessageTypes(),
                tourService.getTours(),
                tourService.getInfoMessages()
            ]);
            setUsers(allUsers);
            setInfoMessageTypes(types);
            processEventsData(tours, infoMessages, types);
        } catch (err) {
            console.error('Failed to load initial data:', err);
        }
    };

    const loadTours = async (providedTypes = null) => {
        try {
            const [tours, infoMessages, fetchedTypes] = await Promise.all([
                tourService.getTours(),
                tourService.getInfoMessages(),
                providedTypes ? Promise.resolve(providedTypes) : configService.getInfoMessageTypes()
            ]);
            processEventsData(tours, infoMessages, fetchedTypes);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };



    const handleDateClick = (arg) => {
        if (!isCoordinator) return;

        const dateStr = arg?.dateStr || new Date().toLocaleDateString('en-CA');
        const [datePart, timePart] = dateStr.split('T');

        setSubmitError(null);
        setSelectedTour({
            date: datePart,
            startTime: timePart ? timePart.substring(0, 5) : '10:00',
            isTemplate: true
        });
        setIsFormOpen(true);
    };

    const handleEventClick = (arg) => {
        setSubmitError(null);
        const { isInfoMessage } = arg.event.extendedProps;

        if (isInfoMessage) {
            setSelectedInfoMessage({
                ...arg.event.extendedProps
            });
            setIsInfoFormOpen(true);
        } else {
            setSelectedTour({
                ...arg.event.extendedProps,
                _id: arg.event.id
            });
            setIsFormOpen(true);
        }
    };

    const handleInfoMessageSave = async (data) => {
        try {
            if (data._id && !data.isRecurring) {
                await tourService.updateInfoMessage(data._id, data);
            } else if (data._id && data.isRecurring) {
                // For simplified logic, recurring messages are always updated as a whole
                await tourService.updateInfoMessage(data._id, data);
            } else {
                await tourService.createInfoMessage(data);
            }
            setIsInfoFormOpen(false);
            loadTours();
        } catch (err) {
            console.error('Failed to save info message:', err);
            alert('Failed to save message');
        }
    };

    const handleInfoMessageDelete = async (id) => {
        try {
            await tourService.deleteInfoMessage(id);
            setIsInfoFormOpen(false);
            loadTours();
        } catch (err) {
            console.error('Failed to delete info message:', err);
        }
    };

    const handleSaveTour = async (formData, forceOverride = false) => {
        setSubmitError(null);
        try {
            const dataToSend = forceOverride
                ? { ...formData, forceCreate: true, forceUpdate: true }
                : formData;

            if (formData._id) {
                await tourService.updateTour(formData._id, dataToSend);
            } else {
                await tourService.createTour(dataToSend);
            }
            setIsFormOpen(false);
            loadTours();
        } catch (err) {
            console.error('Save failed:', err);

            // Check if it's a conflict error (409 status)
            if (err.response?.status === 409 && err.response?.data?.conflict) {
                const conflictData = err.response.data;
                setSubmitError(`CONFLICT_ERROR:${conflictData.message}`);
            } else {
                setSubmitError(err.response?.data?.message || err.message);
            }
        }
    };

    const handleDeleteTour = async (id) => {
        try {
            await tourService.deleteTour(id);
            setIsFormOpen(false);
            loadTours();
        } catch (err) {
            console.error('Delete failed:', err);
            setSubmitError(err.response?.data?.message || 'Failed to delete tour');
        }
    };

    const handleMoveGroup = async (currentFormData, groupIdx, destinationId, targetDate, startTime, endTime) => {
        setSubmitError(null);
        try {
            const movedGroup = currentFormData.groups[groupIdx];
            const remainingGroups = currentFormData.groups.filter((_, i) => i !== groupIdx);

            if (remainingGroups.length === 0) {
                await tourService.deleteTour(currentFormData._id);
            } else {
                const sourceUpdate = {
                    ...currentFormData,
                    primaryGuide: currentFormData.primaryGuide === '' ? null : currentFormData.primaryGuide,
                    groups: remainingGroups,
                    forceUpdate: true
                };
                await tourService.updateTour(currentFormData._id, sourceUpdate);
            }

            if (destinationId === 'new') {
                await tourService.createTour({
                    title: movedGroup.name || currentFormData.title,
                    date: targetDate,
                    startTime: startTime || currentFormData.startTime,
                    endTime: endTime || currentFormData.endTime,
                    language: currentFormData.language,
                    color: currentFormData.color,
                    primaryGuide: currentFormData.primaryGuide === '' ? null : currentFormData.primaryGuide,
                    isWorkshop: currentFormData.isWorkshop,
                    isShiur: currentFormData.isShiur,
                    groups: [movedGroup],
                    forceCreate: true
                });
            } else {
                const destTour = events
                    .filter(e => !e.extendedProps?.isInfoMessage)
                    .map(e => e.extendedProps)
                    .find(t => t._id === destinationId);
                if (destTour) {
                    await tourService.updateTour(destinationId, {
                        ...destTour,
                        primaryGuide: destTour.primaryGuide?._id || destTour.primaryGuide || null,
                        assignedGuides: destTour.assignedGuides?.map(g => g._id || g) || [],
                        groups: [...destTour.groups, movedGroup],
                        forceUpdate: true
                    });
                }
            }

            setIsFormOpen(false);
            loadTours();
        } catch (err) {
            console.error('Move group failed:', err);
            setSubmitError(err.response?.data?.message || 'Failed to move group');
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Google Calendar?')) return;
        try {
            await tourService.disconnectCalendar();
            window.location.reload();
        } catch (err) {
            console.error('Failed to disconnect:', err);
        }
    };
    const renderEventContent = (eventInfo) => {
        const { extendedProps } = eventInfo.event;

        if (extendedProps.isInfoMessage) {
            const displayTime = !extendedProps.allDay
                ? (extendedProps.endTime ? `${extendedProps.startTime}-${extendedProps.endTime}` : extendedProps.startTime)
                : '';

            return (
                <div className="custom-event-content info-message-event" style={{ borderLeft: `4px solid ${extendedProps.resolvedColor || '#475569'}` }}>
                    <div className="event-main">
                        <span className="event-title"><MessageSquare size={12} style={{ marginRight: '4px' }} /> {eventInfo.event.title}</span>
                        {displayTime && <span className="event-time">{displayTime}</span>}
                    </div>
                    {extendedProps.isRecurring && (
                        <div className="event-meta">
                            <span className="event-info-pill" style={{ fontSize: '10px', opacity: 0.8 }}>🔄 {extendedProps.recurringType}</span>
                        </div>
                    )}
                </div>
            );
        }

        const totalPeople = extendedProps.groups?.reduce((sum, g) =>
            sum + (g.counts?.regular || 0) + (g.counts?.seniorSoldier || 0) + (g.counts?.child || 0) + (g.counts?.group || 0), 0) || 0;

        // Format time for display (remove leading zero and :00 seconds)
        const formatTime = (time) => {
            if (!time) return '';
            return time.replace(/^0/, '').replace(':00', '');
        };

        const startTime = formatTime(extendedProps.startTime);
        const endTime = formatTime(extendedProps.endTime);
        const timeRange = startTime && endTime ? `${startTime}-${endTime}` : '';

        const allGroupsCancelled = extendedProps.groups?.length > 0 && extendedProps.groups.every(g => g.status === 'Cancelled' || g.status === 'canceled');

        const totalGroups = extendedProps.groups?.length || 0;
        const paidCount = totalGroups > 0 ? extendedProps.groups.filter(g => g.booking?.prepaid).length : 0;
        const paymentStatus = totalGroups === 0
            ? ''
            : paidCount === 0
                ? 'unpaid'
                : paidCount === totalGroups
                    ? 'paid'
                    : 'partial';

        return (
            <div className={`custom-event-content ${allGroupsCancelled ? 'cancelled-tour' : ''}`}>
                <div className="event-main">
                    <span className="event-title" dir="auto">{eventInfo.event.title}</span>
                    {timeRange && <span className="event-time">{timeRange}</span>}
                </div>
                <div className="event-meta">
                    {allGroupsCancelled && (
                        <span className="event-info-pill danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>CANCELLED</span>
                    )}
                    {extendedProps.isWorkshop && (
                        <span className="event-info-pill workshop">WS</span>
                    )}
                    <span className="event-info-pill lang">{extendedProps.language?.substring(0, 2).toUpperCase()}</span>
                    <span className={`event-info-pill people ${paymentStatus}`}>👥 {totalPeople}</span>
                    {(extendedProps.groups?.length || 0) > 1 && (
                        <span className="event-info-pill groups">{extendedProps.groups.length} grps</span>
                    )}
                    {extendedProps.primaryGuide && (
                        <span className="event-info-pill guide" title={extendedProps.primaryGuide?.name}>
                            👤 {extendedProps.primaryGuide?.name?.split(' ')[0]}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    const isCoordinator = currentUser?.role === 'Coordinator';
    const isLinked = currentUser?.googleTokens?.access_token || currentUser?.googleTokens?.refresh_token;

    const matchesSearch = (extProps) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            extProps.title?.toLowerCase().includes(q) ||
            extProps.groups?.some(g => g.name?.toLowerCase().includes(q)) ||
            extProps.groups?.some(g => g.contact?.leaderName?.toLowerCase().includes(q)) ||
            extProps.primaryGuide?.name?.toLowerCase().includes(q) ||
            extProps.date?.includes(q) ||
            extProps.createdBy?.toLowerCase().includes(q)
        );
    };

    const filteredEvents = searchQuery.trim()
        ? events.filter(e => e.extendedProps?.isInfoMessage || matchesSearch(e.extendedProps))
        : events;

    const upcomingTours = filteredEvents
        .map(e => ({ ...e.extendedProps, id: e.id }))
        .filter(tour => {
            // Filter out info messages from tours sidebar (check both flag and type)
            if (tour.isInfoMessage || tour.type === 'info') return false;

            const tourDate = new Date(tour.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isUpcoming = tourDate >= today;
            if (!isUpcoming) return false;

            if (isCoordinator) return true;

            // For guides, check if they are in the assignedGuides list
            const guideIds = tour.assignedGuides?.map(g => g._id || g) || [];
            return guideIds.includes(currentUser.id);
        })
        .sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`))
        .slice(0, searchQuery.trim() ? 50 : 10);

    return (
        <div className="calendar-page-layout">
            <header className="calendar-header">
                <div className="header-main-row">
                    <div className="header-search-wrapper">
                        <input
                            type="text"
                            className="header-search"
                            placeholder="Search tours..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="header-search-clear" onClick={() => setSearchQuery('')} title="Clear">×</button>
                        )}
                    </div>
                    {isCoordinator && (
                        <Link to="/dashboard" className="btn-primary flex-center" title="Staff Dashboard">
                            <BarChart3 size={18} /><span className="btn-label"> Dashboard</span>
                        </Link>
                    )}
                </div>
                {isCoordinator && (
                    <div className="header-secondary-row">
                        <button className="btn-primary flex-center" title="New Info Message" onClick={() => { setSelectedInfoMessage(null); setIsInfoFormOpen(true); }}>
                            <MessageSquare size={18} /><span className="btn-label"> Info Message</span>
                        </button>
                        <button className="btn-primary flex-center" title="New Tour" onClick={() => handleDateClick()}>
                            <Plus size={18} /><span className="btn-label"> New Tour</span>
                        </button>
                    </div>
                )}
            </header>

            <div className="calendar-main-column">
                <div className="calendar-wrapper">
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={filteredEvents}
                        editable={isCoordinator}
                        selectable={isCoordinator}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        eventContent={renderEventContent}
                        height="auto"
                        contentHeight={650}
                    />
                </div>
            </div>

            <aside className="upcoming-tours-sidebar">
                <div className="sidebar-header">
                    <h3>Upcoming Tours</h3>
                </div>
                <div className="tours-list">
                    {upcomingTours.length > 0 ? (
                        upcomingTours.map(tour => {
                            const allGroupsCancelled = tour.groups?.length > 0 && tour.groups.every(g => g.status === 'Cancelled' || g.status === 'canceled');

                            const totalGroups = tour.groups?.length || 0;
                            const paidCount = totalGroups > 0 ? tour.groups.filter(g => g.booking?.prepaid).length : 0;
                            const paymentText = totalGroups === 0
                                ? ''
                                : totalGroups === 1
                                    ? (paidCount === 1 ? 'Paid' : 'Unpaid')
                                    : `${paidCount}/${totalGroups} paid`;

                            return (
                                <div
                                    key={tour.id}
                                    className={`tour-item ${allGroupsCancelled ? 'cancelled-tour' : ''}`}
                                    onClick={() => handleEventClick({ event: { id: tour.id, extendedProps: tour } })}
                                    style={{ borderLeftColor: tour.color || '#3b82f6' }}
                                >
                                    <div className="tour-meta">
                                        {new Date(tour.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })} • {tour.startTime}
                                    </div>
                                    <div className="tour-title" dir="auto">
                                        {tour.title}
                                        {allGroupsCancelled && <span className="cancelled" style={{ marginLeft: '6px', padding: '2px 4px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '4px', fontWeight: 'bold' }}>CANCELLED</span>}
                                    </div>
                                    <div className="tour-stats">
                                        {tour.isWorkshop && <span className="workshop-tag">WS</span>}
                                        <span className="lang-tag">{tour.language?.substring(0, 2).toUpperCase()}</span>
                                        <span className="people-tag">
                                            👥 {tour.groups?.reduce((sum, g) => sum + (g.counts?.regular || 0) + (g.counts?.seniorSoldier || 0) + (g.counts?.child || 0) + (g.counts?.group || 0), 0) || 0}
                                        </span>
                                        {paymentText && (
                                            <span className={`payment-tag ${paidCount === 0 ? 'unpaid' : paidCount === totalGroups ? 'paid' : 'partial'}`}>{paymentText}</span>
                                        )}
                                        {(tour.groups?.length || 0) > 1 && (
                                            <span className="groups-tag">🗂 {tour.groups.length} groups</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-tours">
                            No upcoming tours
                        </div>
                    )}
                </div>
            </aside>

            {isFormOpen && (
                <TourForm
                    tour={selectedTour}
                    guides={users}
                    currentUser={currentUser}
                    error={submitError}
                    allTours={events.filter(e => !e.extendedProps?.isInfoMessage).map(e => e.extendedProps)}
                    onSave={handleSaveTour}
                    onDelete={handleDeleteTour}
                    onCancel={() => setIsFormOpen(false)}
                    onMoveGroup={handleMoveGroup}
                />
            )}

            {isInfoFormOpen && (
                <InfoMessageForm
                    message={selectedInfoMessage}
                    onSave={handleInfoMessageSave}
                    onDelete={handleInfoMessageDelete}
                    onCancel={() => setIsInfoFormOpen(false)}
                />
            )}
        </div>
    );
};

export default Calendar;
