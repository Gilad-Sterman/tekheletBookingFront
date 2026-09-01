import React, { useState, useEffect, useRef } from 'react';
import { tourService } from '../../services/api.service';
import configService from '../../services/config.service';
import { X, ChevronDown, ChevronLeft, ChevronRight, Trash2, Copy, Check, ArrowRightFromLine } from 'lucide-react';
import TimeInput from '../TimeInput/TimeInput';
import MoveGroupModal from '../MoveGroupModal/MoveGroupModal';

const TourForm = ({ tour, guides = [], currentUser, error, allTours = [], onSave, onDelete, onCancel, onMoveGroup }) => {
    const isCoordinator = currentUser?.role === 'Coordinator';
    const canEdit = isCoordinator || (tour && tour.isTemplate);
    const modalRef = useRef(null);

    const [activeTab, setActiveTab] = useState('Visit Details');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [endTimeOverride, setEndTimeOverride] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [showDraftBanner, setShowDraftBanner] = useState(false);
    const [pendingDraft, setPendingDraft] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [copied, setCopied] = useState(false);
    const [copiedGroupIdx, setCopiedGroupIdx] = useState(null);
    const [moveGroupIdx, setMoveGroupIdx] = useState(null);
    const [expandedExtGuide, setExpandedExtGuide] = useState(new Set());
    const titleManuallySetRef = useRef(!!(tour && !tour.isTemplate));
    const draftKeyRef = useRef(tour?._id ? `tour-draft-${tour._id}` : 'tour-draft-new');

    // Dynamic configuration state
    const [configData, setConfigData] = useState({
        groupTypes: [],
        groupStatus: [],
        languages: [],
        pricing: { basePrices: {}, discountRules: {} },
        paymentStatus: [],
        dynamicGuides: [],
        bookingSources: [],
        tourSettings: { regularDuration: 60, workshopDuration: 90 },
        creatorNames: []
    });
    const [configLoaded, setConfigLoaded] = useState(false);

    // Load configuration data on component mount
    useEffect(() => {
        const loadConfigurations = async () => {
            try {
                const [groupTypes, groupStatus, languages, pricing, paymentStatus, dynamicGuides, bookingSources, tourSettings, creatorNames] = await Promise.all([
                    configService.getGroupTypes(),
                    configService.getGroupStatus(),
                    configService.getLanguages(),
                    configService.getPricing(),
                    configService.getPaymentStatus(),
                    configService.getGuides(),
                    configService.getBookingSources(),
                    configService.getTourSettings(),
                    configService.getCreatorNames()
                ]);

                setConfigData({
                    groupTypes,
                    groupStatus,
                    languages,
                    pricing,
                    paymentStatus,
                    dynamicGuides,
                    bookingSources,
                    tourSettings,
                    creatorNames
                });
                setConfigLoaded(true);
            } catch (error) {
                console.error('Failed to load configurations:', error);
                // Fallback to hardcoded values if config fails
                setConfigData({
                    groupTypes: [
                        { id: 'individual', label: 'Individual/Family' },
                        { id: 'day_school', label: 'School' },
                        { id: 'organization', label: 'Organization' }
                    ],
                    groupStatus: [
                        { id: 'scheduled', label: 'Scheduled' },
                        { id: 'confirmed', label: 'Confirmed' },
                        { id: 'cancelled', label: 'Cancelled' }
                    ],
                    languages: [
                        { id: 'english', label: 'English' },
                        { id: 'hebrew', label: 'Hebrew' }
                    ],
                    pricing: { basePrices: { regular: 40, seniorSoldier: 30, child: 0, workshop: 200 }, discountRules: {} },
                    paymentStatus: [
                        { id: 'pending', label: 'Pending' },
                        { id: 'paid', label: 'Paid' },
                        { id: 'partial', label: 'Partial' },
                        { id: 'cancelled', label: 'Cancelled' },
                        { id: 'refunded', label: 'Refunded' }
                    ],
                    dynamicGuides: guides,
                    bookingSources: [
                        { id: 'email', label: 'Email' },
                        { id: 'walk_in', label: 'Walk in' },
                        { id: 'we_reached_out', label: 'We reached out' },
                        { id: 'agent', label: 'Tour guide / Travel Agent' }
                    ],
                    tourSettings: { regularDuration: 60, workshopDuration: 90 },
                    creatorNames: [
                        { id: 'baruch_sterman', label: 'Baruch Sterman' },
                        { id: 'judy_sterman', label: 'Judy Sterman' },
                        { id: 'david_orbach', label: 'David Orbach' },
                        { id: 'moshe_stavsky', label: 'Moshe Stavsky' }
                    ]
                });
                setConfigLoaded(true);
            }
        };

        loadConfigurations();
    }, [guides]);

    useEffect(() => {
        if (error && modalRef.current) {
            modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [error]);

    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toLocaleDateString('en-CA'),
        startTime: '10:00',
        endTime: '11:00',
        language: 'English',
        color: '#134869',
        primaryGuide: '',
        assignedGuides: [],
        isWorkshop: false,
        isShiur: false,
        specialRequests: '',
        sensitivities: '',
        timeAlteration: '',
        createdBy: '',
        groups: [{
            name: '',
            type: 'Individual/Family',
            status: 'Scheduled',
            counts: { regular: 0, seniorSoldier: 0, child: 0, group: 0 },
            contact: { leaderName: '', leaderPhone: '', leaderEmail: '', externalGuideName: '', externalGuidePhone: '', externalGuideEmail: '' },
            booking: { source: '', totalCost: 0, paymentLinkSent: false, prepaid: false, notes: '' },
            visitDetails: { incidents: '', mediaLinks: [] },
            engagement: { storeVisit: false, tekheletItems: [], otherItems: [] },
            postVisit: {
                paymentStatus: 'Pending',
                donation: { done: false, amount: 0 },
                reviewRequested: false,
                reviewReceived: false,
                reviewText: '',
                newsletterOptIn: false,
                socialMediaMention: false,
                ambassador: false
            }
        }]
    });

    useEffect(() => {
        if (tour) {
            const sanitizedCreatedBy = tour.createdBy || '';
            const sanitizedGroups = (tour.groups || []).map(group => ({
                ...group,
                counts: { regular: 0, seniorSoldier: 0, child: 0, group: 0, ...(group.counts || {}) },
                contact: { leaderName: '', leaderPhone: '', leaderEmail: '', externalGuideName: '', externalGuidePhone: '', externalGuideEmail: '', ...(group.contact || {}) },
                booking: { source: '', totalCost: 0, paymentLinkSent: false, prepaid: false, notes: '', ...(group.booking || {}) },
                visitDetails: { incidents: '', mediaLinks: [], ...(group.visitDetails || {}) },
                engagement: { storeVisit: false, tekheletItems: [], otherItems: [], ...(group.engagement || {}) },
                postVisit: {
                    paymentStatus: 'Pending',
                    donation: { done: false, amount: 0, ...(group.postVisit?.donation || {}) },
                    reviewRequested: false,
                    reviewReceived: false,
                    reviewText: '',
                    newsletterOptIn: false,
                    socialMediaMention: false,
                    ambassador: false,
                    ...(group.postVisit || {})
                }
            }));

            setFormData(prev => ({
                ...prev,
                ...tour,
                primaryGuide: tour.primaryGuide?._id || tour.primaryGuide || '',
                assignedGuides: tour.assignedGuides?.map(g => g._id || g) || [],
                createdBy: sanitizedCreatedBy,
                groups: sanitizedGroups.length ? sanitizedGroups : prev.groups
            }));

            setEndTimeOverride(tour.endTimeOverride || false);
            setIsDirty(false);
        }
    }, [tour]);

    // Auto-calculate end time based on start time and workshop status
    useEffect(() => {
        if (endTimeOverride) return;
        if (formData.startTime) {
            const [hours, minutes] = formData.startTime.split(':').map(Number);
            const duration = formData.isWorkshop
                ? (configData.tourSettings?.workshopDuration || 90)
                : (configData.tourSettings?.regularDuration || 60);

            const startDate = new Date();
            startDate.setHours(hours, minutes, 0);

            const endDate = new Date(startDate.getTime() + duration * 60000);
            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
            const newEndTime = `${endHours}:${endMinutes}`;

            if (newEndTime !== formData.endTime) {
                setFormData(prev => ({ ...prev, endTime: newEndTime }));
            }
        }
    }, [formData.startTime, formData.isWorkshop, configData.tourSettings, endTimeOverride]);

    // Draft persistence — auto-save to localStorage
    useEffect(() => {
        if (!isDirty) return;
        const id = setTimeout(() => {
            try {
                localStorage.setItem(draftKeyRef.current, JSON.stringify({ formData, activeTab }));
            } catch (e) {}
        }, 800);
        return () => clearTimeout(id);
    }, [formData, activeTab, isDirty]);

    // On mount: check for a saved draft
    useEffect(() => {
        if (!canEdit) return;
        const saved = localStorage.getItem(draftKeyRef.current);
        if (saved) {
            try {
                setPendingDraft(JSON.parse(saved));
                setShowDraftBanner(true);
            } catch (e) {}
        }
    }, []);

    // Seed title from group names on mount for new tours
    useEffect(() => {
        if ((tour && !tour.isTemplate) || titleManuallySetRef.current) return;
        const allNames = formData.groups.map(g => g.name).filter(n => n && n.trim());
        if (allNames.length > 0) {
            setFormData(prev => ({ ...prev, title: allNames.join(' - ') }));
        }
    }, []);

    const tabs = ['Visit Details', 'Additional Groups', 'Booking & Payment', 'Post-Tour'];

    const addGroup = () => {
        setFormData(prev => ({
            ...prev,
            groups: [...prev.groups, {
                name: '',
                type: 'Individual/Family',
                status: 'Scheduled',
                counts: { regular: 0, seniorSoldier: 0, child: 0, group: 0 },
                contact: { leaderName: '', leaderPhone: '', leaderEmail: '', externalGuideName: '', externalGuidePhone: '', externalGuideEmail: '' },
                booking: { source: '', totalCost: 0, paymentLinkSent: false, prepaid: false },
                visitDetails: { incidents: '', mediaLinks: [] },
                engagement: { storeVisit: false, tekheletItems: [], otherItems: [] },
                postVisit: {
                    paymentStatus: 'Pending',
                    donation: { done: false, amount: 0 },
                    reviewRequested: false,
                    reviewReceived: false,
                    reviewText: '',
                    newsletterOptIn: false,
                    socialMediaMention: false,
                    ambassador: false
                }
            }]
        }));
    };

    const removeGroup = (index) => {
        if (formData.groups.length <= 1) return;
        setFormData(prev => {
            const newGroups = prev.groups.filter((_, i) => i !== index);
            const update = { ...prev, groups: newGroups };
            if (!titleManuallySetRef.current) {
                const allNames = newGroups.map(g => g.name).filter(n => n && n.trim());
                update.title = allNames.join(' - ');
            }
            return update;
        });
    };

    const handleChange = (e, groupIndex = null) => {
        if (!canEdit) return;
        setIsDirty(true);
        if (validationError) setValidationError(null);
        const { name, value, type, checked } = e.target;
        const finalValue = type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value);

        if (name === 'title') titleManuallySetRef.current = true;

        if (groupIndex !== null) {
            setFormData(prev => {
                const newGroups = [...prev.groups];
                const group = { ...newGroups[groupIndex] };

                if (name.includes('.')) {
                    const keys = name.split('.');
                    let target = group;

                    // Navigate to the parent object
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!target[keys[i]]) {
                            target[keys[i]] = {};
                        }
                        target[keys[i]] = { ...target[keys[i]] };
                        target = target[keys[i]];
                    }

                    // Set the final value
                    target[keys[keys.length - 1]] = finalValue;
                } else {
                    group[name] = finalValue;
                }

                // Auto-calc total cost when count fields change
                if (name.startsWith('counts.') && !group.booking?.priceManualOverride) {
                    const reg = group.counts?.regular || 0;
                    const sen = group.counts?.seniorSoldier || 0;
                    const grp = group.counts?.group || 0;
                    const chi = group.counts?.child || 0;
                    const total = reg + sen + grp + chi;
                    const prices = configData.pricing?.basePrices || { regular: 40, seniorSoldier: 30, group: 36, workshop: 200 };
                    let autoTotal = reg * (prices.regular || 40) + sen * (prices.seniorSoldier || 30) + grp * (prices.group || 36);
                    if (prev.isWorkshop && total > 0) {
                        autoTotal += Math.ceil(total / 5) * (prices.workshop || 200);
                    }
                    group.booking = { ...group.booking, totalCost: autoTotal };
                }

                // Mark manual override when user directly edits the cost field
                if (name === 'booking.totalCost') {
                    group.booking = { ...group.booking, priceManualOverride: true };
                }

                newGroups[groupIndex] = group;

                // Auto-title: compose from all group names (any group change)
                if (name === 'name' && !titleManuallySetRef.current) {
                    const allNames = newGroups.map(g => g.name).filter(n => n && n.trim());
                    return { ...prev, groups: newGroups, title: allNames.join(' - ') };
                }
                return { ...prev, groups: newGroups };
            });
            return;
        }

        if (name === 'assignedGuides') {
            const guideId = value;
            setFormData(prev => {
                const currentGuides = prev.assignedGuides || [];
                const newGuides = checked
                    ? [...currentGuides, guideId]
                    : currentGuides.filter(id => id !== guideId);
                return { ...prev, assignedGuides: newGuides };
            });
            return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: finalValue }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: finalValue
            }));
        }
    };

    // Price calculation function using dynamic pricing
    const calculateGroupPrice = (group) => {
        const regular = group.counts?.regular || 0;
        const seniorSoldier = group.counts?.seniorSoldier || 0;
        const child = group.counts?.child || 0;
        const groupTickets = group.counts?.group || 0;
        const totalParticipants = regular + seniorSoldier + child + groupTickets;

        // Get dynamic pricing from config
        const basePrices = configData.pricing?.basePrices || { regular: 40, seniorSoldier: 30, child: 0, group: 36, workshop: 200 };
        const discountRules = configData.pricing?.discountRules || {};

        // Base prices using dynamic values
        let regularCost = regular * (basePrices.regular || 40);
        let seniorCost = seniorSoldier * (basePrices.seniorSoldier || 30);
        let childCost = child * (basePrices.child || 0);
        let groupCost = groupTickets * (basePrices.group || 36);

        // Workshop fee calculation using dynamic pricing
        let workshopCost = 0;
        if (formData.isWorkshop && totalParticipants > 0) {
            const workshopPrice = basePrices.workshop || 200;
            workshopCost = workshopPrice * Math.ceil(totalParticipants / 5);
        }

        let subtotal = regularCost + seniorCost + childCost + groupCost + workshopCost;

        // Dynamic discount logic
        let discount = 0;
        let discountReason = '';

        const groupDiscountRule = discountRules.groupDiscount || { threshold: 20, percentage: 0.10 };

        if (totalParticipants >= groupDiscountRule.threshold) {
            discount = subtotal * groupDiscountRule.percentage;
            discountReason = `${Math.round(groupDiscountRule.percentage * 100)}% group discount (${groupDiscountRule.threshold}+ people)`;
        }

        const finalPrice = Math.round(subtotal - discount);

        return {
            regularCost,
            seniorCost,
            childCost,
            groupCost,
            workshopCost,
            subtotal,
            discount,
            discountReason,
            finalPrice,
            currency: basePrices.currency || '₪'
        };
    };

    const handleCalculatePrice = (groupIndex) => {
        const group = formData.groups[groupIndex];
        const calculation = calculateGroupPrice(group);

        setFormData(prev => {
            const newGroups = [...prev.groups];
            newGroups[groupIndex] = {
                ...newGroups[groupIndex],
                booking: {
                    ...newGroups[groupIndex].booking,
                    totalCost: calculation.finalPrice
                }
            };
            return { ...prev, groups: newGroups };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEdit) return;

        // Final validation before save
        if (!formData.title) {
            setValidationError('Tour Title is required.');
            scrollModalToTop();
            return;
        }

        if (formData.endTime <= formData.startTime) {
            setValidationError('End time must be after start time.');
            scrollModalToTop();
            return;
        }

        // Phone/email OR validation — commented out, re-enable if needed
        // const missingContactIdx = formData.groups.findIndex(
        //     g => !g.contact?.leaderPhone?.trim() && !g.contact?.leaderEmail?.trim()
        // );
        // if (missingContactIdx !== -1) {
        //     const groupLabel = formData.groups[missingContactIdx].name || `Group ${missingContactIdx + 1}`;
        //     setValidationError(`"${groupLabel}" requires at least a phone number or email address.`);
        //     scrollModalToTop();
        //     return;
        // }

        // Clean primaryGuide for backend and convert string fields to arrays
        const dataToSave = {
            ...formData,
            endTimeOverride,
            primaryGuide: formData.primaryGuide === '' ? null : formData.primaryGuide,
            groups: formData.groups.map(group => ({
                ...group,
                engagement: {
                    ...group.engagement,
                    tekheletItems: typeof group.engagement?.tekheletItems === 'string'
                        ? group.engagement.tekheletItems.split(',').map(item => item.trim()).filter(item => item)
                        : (group.engagement?.tekheletItems || []),
                    otherItems: typeof group.engagement?.otherItems === 'string'
                        ? group.engagement.otherItems.split(',').map(item => item.trim()).filter(item => item)
                        : (group.engagement?.otherItems || [])
                },
                visitDetails: {
                    ...group.visitDetails,
                    mediaLinks: typeof group.visitDetails?.mediaLinks === 'string'
                        ? group.visitDetails.mediaLinks.split('\n').map(link => link.trim()).filter(link => link)
                        : (group.visitDetails?.mediaLinks || [])
                }
            }))
        };

        // Ensure primaryGuide is included in assignedGuides for GCal sync
        if (dataToSave.primaryGuide) {
            const guideSet = new Set(dataToSave.assignedGuides || []);
            guideSet.add(dataToSave.primaryGuide);
            dataToSave.assignedGuides = Array.from(guideSet);
        }

        clearDraft();
        onSave(dataToSave);
    };

    const handleForceSave = () => {
        if (!canEdit) return;
        const dataToSave = {
            ...formData,
            primaryGuide: formData.primaryGuide === '' ? null : formData.primaryGuide,
            groups: formData.groups.map(group => ({
                ...group,
                engagement: {
                    ...group.engagement,
                    tekheletItems: typeof group.engagement?.tekheletItems === 'string'
                        ? group.engagement.tekheletItems.split(',').map(item => item.trim()).filter(item => item)
                        : (group.engagement?.tekheletItems || []),
                    otherItems: typeof group.engagement?.otherItems === 'string'
                        ? group.engagement.otherItems.split(',').map(item => item.trim()).filter(item => item)
                        : (group.engagement?.otherItems || [])
                },
                visitDetails: {
                    ...group.visitDetails,
                    mediaLinks: typeof group.visitDetails?.mediaLinks === 'string'
                        ? group.visitDetails.mediaLinks.split('\n').map(link => link.trim()).filter(link => link)
                        : (group.visitDetails?.mediaLinks || [])
                }
            }))
        };
        if (dataToSave.primaryGuide) {
            const guideSet = new Set(dataToSave.assignedGuides || []);
            guideSet.add(dataToSave.primaryGuide);
            dataToSave.assignedGuides = Array.from(guideSet);
        }
        clearDraft();
        onSave(dataToSave, true);
    };

    const scrollModalToTop = () => {
        if (modalRef.current) modalRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClose = () => {
        if (isDirty) {
            scrollModalToTop();
            setShowCloseConfirm(true);
        } else {
            onCancel();
        }
    };

    const handleNext = () => {
        const currIdx = tabs.indexOf(activeTab);
        if (currIdx < tabs.length - 1) {
            setActiveTab(tabs[currIdx + 1]);
            scrollModalToTop();
        }
    };

    const handleBack = () => {
        const currIdx = tabs.indexOf(activeTab);
        if (currIdx > 0) {
            setActiveTab(tabs[currIdx - 1]);
            scrollModalToTop();
        }
    };

    const clearDraft = () => localStorage.removeItem(draftKeyRef.current);

    const restoreDraft = () => {
        if (pendingDraft) {
            setFormData(pendingDraft.formData);
            setActiveTab(pendingDraft.activeTab || 'Visit Details');
            setIsDirty(true);
        }
        setShowDraftBanner(false);
        setPendingDraft(null);
    };

    const discardDraft = () => {
        clearDraft();
        setShowDraftBanner(false);
        setPendingDraft(null);
    };

    const copyText = (text) => {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;padding:0;border:none;outline:none;opacity:0;';
        document.body.appendChild(el);
        el.focus();
        el.setSelectionRange(0, text.length); // iOS Safari requires this instead of el.select()
        try {
            document.execCommand('copy');
            document.body.removeChild(el);
            return Promise.resolve();
        } catch {
            document.body.removeChild(el);
            return navigator.clipboard.writeText(text);
        }
    };

    const handleCopy = () => {
        const dateStr = formData.date
            ? new Date(formData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'No date set';

        const timeStr = `${formData.startTime || '--:--'} - ${formData.endTime || '--:--'}`;

        const groupLines = formData.groups.map((group, idx) => {
            const c = group.counts || {};
            const parts = [];
            if (c.regular) parts.push(`${c.regular} Regular`);
            if (c.seniorSoldier) parts.push(`${c.seniorSoldier} Senior/Soldier`);
            if (c.child) parts.push(`${c.child} Child`);
            if (c.group) parts.push(`${c.group} Group (36₪)`);
            const name = group.name || `Group ${idx + 1}`;
            return `Group ${idx + 1}: ${name}${parts.length ? ' - ' + parts.join(', ') : ''}`;
        }).join('\n');

        const total = formData.groups.reduce((sum, g) => {
            const c = g.counts || {};
            return sum + (c.regular || 0) + (c.seniorSoldier || 0) + (c.child || 0) + (c.group || 0);
        }, 0);

        const text = [
            `Tour: ${formData.title || 'Untitled Tour'}`,
            dateStr,
            timeStr,
            formData.isWorkshop ? 'Workshop included' : null,
            '',
            groupLines,
            '',
            `Total: ${total} participants`,
        ].filter(l => l !== null).join('\n');

        copyText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const isExtGuideOpen = (idx) => expandedExtGuide.has(idx);

    const toggleExtGuide = (idx) => {
        setExpandedExtGuide(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    const handleCopyGroup = (idx) => {
        const group = formData.groups[idx];
        const dateStr = formData.date
            ? new Date(formData.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            : 'No date set';
        const timeStr = `${formData.startTime || '--:--'} - ${formData.endTime || '--:--'}`;
        const c = group.counts || {};
        const parts = [];
        if (c.regular) parts.push(`${c.regular} Regular`);
        if (c.seniorSoldier) parts.push(`${c.seniorSoldier} Senior/Soldier`);
        if (c.child) parts.push(`${c.child} Child`);
        if (c.group) parts.push(`${c.group} Group (36₪)`);
        const total = (c.regular || 0) + (c.seniorSoldier || 0) + (c.child || 0) + (c.group || 0);
        const contact = group.contact || {};
        const lines = [
            dateStr,
            timeStr,
            formData.isWorkshop ? 'Workshop included' : null,
            '',
            `Group: ${group.name || `Group ${idx + 1}`}`,
            group.status ? `Status: ${group.status}` : null,
            contact.leaderName ? `Leader: ${contact.leaderName}` : null,
            contact.leaderPhone ? `Phone: ${contact.leaderPhone}` : null,
            contact.leaderEmail ? `Email: ${contact.leaderEmail}` : null,
            contact.externalGuideName ? `External Guide: ${contact.externalGuideName}` : null,
            contact.externalGuidePhone ? `Guide Phone: ${contact.externalGuidePhone}` : null,
            '',
            `Participants: ${parts.length ? parts.join(', ') : 'None recorded'}`, 
        ].filter(l => l !== null).join('\n');
        copyText(lines).then(() => {
            setCopiedGroupIdx(idx);
            setTimeout(() => setCopiedGroupIdx(null), 2000);
        });
    };

    const handleMoveConfirm = (destinationId, targetDate, startTime, endTime) => {
        const idx = moveGroupIdx;
        setMoveGroupIdx(null);
        onMoveGroup?.(formData, idx, destinationId, targetDate, startTime, endTime);
    };

    const isEditing = tour && !tour.isTemplate;
    const isOnLastTab = tabs.indexOf(activeTab) === tabs.length - 1;

    return (
        <div className="tour-form-overlay" onClick={handleClose}>
            <div className="tour-form-modal robust-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <div className="flex-between">
                        <div>
                            <h2>{tour && !tour.isTemplate ? (canEdit ? 'Edit Tour' : 'View Tour') : 'New Tour'}</h2>
                            <p className="tour-id-label">{formData._id ? `ID: ${formData._id}` : 'Drafting New Tour'}</p>
                        </div>
                        <div className="header-actions">
                            <button
                                type="button"
                                className={`header-action-btn btn-secondary btn-copy ${copied ? 'copied' : ''}`}
                                onClick={handleCopy}
                                title="Copy tour info to clipboard"
                            >
                                {copied ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                            {isCoordinator && isEditing && (
                                <button type="button" className="header-action-btn btn-danger-ghost" onClick={() => setShowDeleteConfirm(true)} title="Delete Tour">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            {canEdit && (
                                <button type="submit" form="tour-form" className="header-action-btn btn-primary">Save</button>
                            )}
                            <button type="button" className="header-action-btn btn-secondary" onClick={handleClose}>
                                {!canEdit ? 'Close' : 'Cancel'}
                            </button>
                            <button className="btn-close" onClick={handleClose}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                    <nav className="modal-tabs">
                        <button
                            type="button"
                            className="tab-nav-arrow"
                            onClick={handleBack}
                            disabled={tabs.indexOf(activeTab) === 0}
                        >
                            <ChevronLeft size={15} />
                        </button>
                        {tabs.map((tab, idx) => (
                            <button
                                key={tab}
                                type="button"
                                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab); scrollModalToTop(); }}
                                title={tab}
                            >
                                {idx + 1}
                            </button>
                        ))}
                        <button
                            type="button"
                            className="tab-nav-arrow"
                            onClick={handleNext}
                            disabled={isOnLastTab}
                        >
                            <ChevronRight size={15} />
                        </button>
                    </nav>
                </header>

                {validationError && (
                    <div className="error-message">{validationError}</div>
                )}

                {error && (
                    <div className={`error-message ${error.startsWith('CONFLICT_ERROR:') ? 'conflict-alert' : ''}`}>
                        {error.startsWith('CONFLICT_ERROR:') ? (
                            <div className="conflict-error-content">
                                <span>{error.replace('CONFLICT_ERROR:', '')}</span>
                                <button type="button" className="btn-force-save" onClick={handleForceSave}>
                                    ⚠️ Proceed and Double Book
                                </button>
                            </div>
                        ) : error}
                    </div>
                )}

                {showCloseConfirm && (
                    <div className="close-confirm-banner">
                        <span>You have unsaved changes. Leave anyway?</span>
                        <div className="close-confirm-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowCloseConfirm(false)}>Stay</button>
                            <button type="button" className="btn-danger" onClick={() => { clearDraft(); onCancel(); }}>Leave</button>
                        </div>
                    </div>
                )}

                {showDraftBanner && (
                    <div className="draft-restore-banner">
                        <span>📋 Unsaved draft found. Restore it?</span>
                        <div className="draft-restore-actions">
                            <button type="button" className="btn-secondary" onClick={discardDraft}>Discard</button>
                            <button type="button" className="btn-primary" onClick={restoreDraft}>Restore</button>
                        </div>
                    </div>
                )}

                {showDeleteConfirm && (
                    <div className="delete-confirm-banner">
                        <span>Permanently delete this tour?</span>
                        <div className="delete-confirm-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button type="button" className="btn-danger" onClick={() => onDelete(tour._id || tour.id)}>Delete</button>
                        </div>
                    </div>
                )}

                <form id="tour-form" onSubmit={handleSubmit}>
                    <fieldset disabled={!canEdit}>
                        <div className="tab-title-bar">
                            <h3>{activeTab}</h3>
                        </div>
                        {activeTab === 'Visit Details' && (
                            <div className="tab-content">
                                <div className="form-row">
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="title">Tour Title <span className="required-star">*</span></label>
                                        <input id="title" name="title" value={formData.title} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="primaryGuide">Primary Guide</label>
                                        <select id="primaryGuide" name="primaryGuide" value={formData.primaryGuide} onChange={handleChange}>
                                            <option value="">Select Primary Guide</option>
                                            {configLoaded && configData.dynamicGuides.length > 0 ? (
                                                configData.dynamicGuides.map(g => <option key={g._id} value={g._id}>{g.name}</option>)
                                            ) : (
                                                guides.map(g => <option key={g._id} value={g._id}>{g.name}</option>)
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="createdBy">Created By</label>
                                        <select id="createdBy" name="createdBy" value={formData.createdBy} onChange={handleChange}>
                                            <option value="">Select creator...</option>
                                            {configLoaded && configData.creatorNames?.length > 0 ? (
                                                configData.creatorNames.map(c => (
                                                    <option key={c.id} value={c.label}>{c.label}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="Baruch Sterman">Baruch Sterman</option>
                                                    <option value="Judy Sterman">Judy Sterman</option>
                                                    <option value="David Orbach">David Orbach</option>
                                                    <option value="Moshe Stavsky">Moshe Stavsky</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="date">Date <span className="required-star">*</span></label>
                                        <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="language">Language</label>
                                        <select id="language" name="language" value={formData.language} onChange={handleChange}>
                                            {configLoaded ? (
                                                configData.languages.map(lang => (
                                                    <option key={lang.id} value={lang.label}>{lang.label}</option>
                                                ))
                                            ) : (
                                                <>
                                                    <option value="English">English</option>
                                                    <option value="Hebrew">Hebrew</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="startTime">Start Time <span className="required-star">*</span></label>
                                        <TimeInput id="startTime" name="startTime" value={formData.startTime} onChange={handleChange} required />
                                    </div>
                                    <div className="form-group primary-form-group">
                                        <label htmlFor="endTime">
                                            End Time
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    className={`btn-override-toggle ${endTimeOverride ? 'active' : ''}`}
                                                    onClick={() => setEndTimeOverride(prev => !prev)}
                                                    title={endTimeOverride ? 'Revert to auto-calculated' : 'Override end time'}
                                                >
                                                    {endTimeOverride ? 'Auto' : 'Override'}
                                                </button>
                                            )}
                                        </label>
                                        <TimeInput
                                            id="endTime"
                                            name="endTime"
                                            value={formData.endTime}
                                            onChange={handleChange}
                                            disabled={!endTimeOverride}
                                            className={endTimeOverride ? '' : 'read-only-input'}
                                        />
                                    </div>
                                </div>
                                <div className="form-row checkboxes">
                                    <label className="checkbox-label">
                                        <input type="checkbox" name="isWorkshop" checked={formData.isWorkshop} onChange={handleChange} />
                                        <span>Workshop Included</span>
                                    </label>
                                    <label className="checkbox-label">
                                        <input type="checkbox" name="isShiur" checked={formData.isShiur} onChange={handleChange} />
                                        <span>Shiur Included</span>
                                    </label>
                                </div>
                                <div className="form-group primary-form-group">
                                    <label htmlFor="color">Calendar Color</label>
                                    <input id="color" type="color" name="color" value={formData.color} onChange={handleChange} />
                                </div>

                                <div className="form-section">
                                    <h3>Additional Guides</h3>
                                    {!formData.primaryGuide ? (
                                        <p className="helper-text">Select a Primary Guide first to assign additional guides.</p>
                                    ) : (
                                        <div className="guides-grid">
                                            {(configLoaded && configData.dynamicGuides.length > 0 ? configData.dynamicGuides : guides)
                                                .filter(guide => guide._id !== formData.primaryGuide)
                                                .map(guide => (
                                                    <label key={guide._id} className="guide-checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            name="assignedGuides"
                                                            value={guide._id}
                                                            checked={formData.assignedGuides?.includes(guide._id)}
                                                            onChange={handleChange}
                                                        />
                                                        <span className={formData.assignedGuides?.includes(guide._id) ? 'selected' : ''}>
                                                            {guide.name}
                                                        </span>
                                                    </label>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="specialRequests">Special Requests & Sensitivities</label>
                                    <textarea id="specialRequests" name="specialRequests" value={formData.specialRequests} onChange={handleChange} rows="3" placeholder="Note any special requests, sensitivities, or important warnings..." />
                                </div>
                                <div className="form-section primary-group-section">
                                    <div className="flex-between">
                                        <h3>Primary Group</h3>
                                        <div className="group-card-actions">
                                            <button type="button" className="btn-icon-copy" onClick={() => handleCopyGroup(0)} title="Copy group info">
                                                {copiedGroupIdx === 0 ? <Check size={16} /> : <Copy size={16} />}
                                            </button>
                                            {isEditing && canEdit && (
                                                <button type="button" className="btn-icon-move" onClick={() => setMoveGroupIdx(0)} title="Move this group to another tour">
                                                    <ArrowRightFromLine size={16} />
                                                </button>
                                            )}
                                            {canEdit && formData.groups.length > 1 && (
                                                <button type="button" className="btn-icon-danger" onClick={() => removeGroup(0)} title="Remove this group">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-row primary-group-row">
                                        <div className="form-group primary-form-group">
                                            <label>Group Name</label>
                                            <input name="name" value={formData.groups[0]?.name || ''} onChange={(e) => handleChange(e, 0)} placeholder="e.g. Cohen Family" />
                                        </div>
                                        <div className="form-group primary-form-group">
                                            <label>Group Type</label>
                                            <select name="type" value={formData.groups[0]?.type || ''} onChange={(e) => handleChange(e, 0)}>
                                                {configLoaded ? (
                                                    configData.groupTypes.map(type => (
                                                        <option key={type.id} value={type.label}>{type.label}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="Individual/Family">Individual/Family</option>
                                                        <option value="School">School</option>
                                                        <option value="Day School" style={{ display: 'none' }}>School (legacy)</option>
                                                        <option value="Organization">Organization</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-row primary-group-row">
                                        <div className="form-group primary-form-group">
                                            <label>Leader Name</label>
                                            <input name="contact.leaderName" value={formData.groups[0]?.contact?.leaderName || ''} onChange={(e) => handleChange(e, 0)} />
                                        </div>
                                        <div className="form-group primary-form-group">
                                            <label>Regular</label>
                                            <input type="number" name="counts.regular" value={formData.groups[0]?.counts?.regular || 0} onChange={(e) => handleChange(e, 0)} min="0" />
                                        </div>
                                    </div>
                                    <div className="form-row primary-group-row">
                                        <div className="form-group primary-form-group">
                                            <label>Leader Phone</label>
                                            <input name="contact.leaderPhone" value={formData.groups[0]?.contact?.leaderPhone || ''} onChange={(e) => handleChange(e, 0)} />
                                        </div>
                                        <div className="form-group primary-form-group">
                                            <label>Senior/Soldier</label>
                                            <input type="number" name="counts.seniorSoldier" value={formData.groups[0]?.counts?.seniorSoldier || 0} onChange={(e) => handleChange(e, 0)} min="0" />
                                        </div>
                                    </div>
                                    <div className="form-row counters primary-group-row">
                                        <div className="form-group primary-form-group">
                                            <label>Leader Email</label>
                                            <input type="email" name="contact.leaderEmail" value={formData.groups[0]?.contact?.leaderEmail || ''} onChange={(e) => handleChange(e, 0)} />
                                        </div>
                                        <div className="form-group primary-form-group">
                                            <label>Group (36₪)</label>
                                            <input type="number" name="counts.group" value={formData.groups[0]?.counts?.group || 0} onChange={(e) => handleChange(e, 0)} min="0" />
                                        </div>
                                    </div>
                                    {/* <p className="contact-required-hint">* Phone or email required</p> */}
                                    <div className="form-row primary-group-row">
                                        <div className="form-group primary-form-group">
                                            <label>Status</label>
                                            <select name="status" value={formData.groups[0]?.status || 'Scheduled'} onChange={(e) => handleChange(e, 0)}>
                                                {configLoaded ? (
                                                    configData.groupStatus.map(status => (
                                                        <option key={status.id} value={status.label}>{status.label}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="Scheduled">Scheduled</option>
                                                        <option value="Confirmed">Confirmed</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="external-guide-section">
                                        <button type="button" className="external-guide-toggle" onClick={() => toggleExtGuide(0)}>
                                            <span>External Tour Guide <span className="optional-label">(Optional)</span></span>
                                            <ChevronDown size={14} className={isExtGuideOpen(0) ? 'chevron-open' : ''} />
                                        </button>
                                        {isExtGuideOpen(0) && (
                                            <div className="external-guide-fields">
                                                <div className="form-row primary-group-row">
                                                    <div className="form-group primary-form-group">
                                                        <label>Guide Name</label>
                                                        <input name="contact.externalGuideName" value={formData.groups[0]?.contact?.externalGuideName || ''} onChange={(e) => handleChange(e, 0)} placeholder="External guide name" />
                                                    </div>
                                                    <div className="form-group primary-form-group">
                                                        <label>Guide Phone</label>
                                                        <input name="contact.externalGuidePhone" value={formData.groups[0]?.contact?.externalGuidePhone || ''} onChange={(e) => handleChange(e, 0)} placeholder="External guide phone" />
                                                    </div>
                                                </div>
                                                <div className="form-row primary-group-row">
                                                    <div className="form-group primary-form-group">
                                                        <label>Guide Email</label>
                                                        <input type="email" name="contact.externalGuideEmail" value={formData.groups[0]?.contact?.externalGuideEmail || ''} onChange={(e) => handleChange(e, 0)} placeholder="External guide email" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Additional Groups' && (
                            <div className="tab-content">
                                {formData.groups.length <= 1 && (
                                    <p className="helper-text no-additional-groups">No additional groups yet. Click "+ Add Another Group" to add more groups to this tour.</p>
                                )}
                                <div className="groups-list">
                                    {formData.groups.slice(1).map((group, sliceIdx) => {
                                        const idx = sliceIdx + 1;
                                        return (
                                            <div key={idx} className="group-card">
                                                <header className="group-card-header flex-between">
                                                    <h4>{group.name || `Group ${idx + 1}`}</h4>
                                                    <div className="group-card-actions">
                                                        <button type="button" className="btn-icon-copy" onClick={() => handleCopyGroup(idx)} title="Copy group info">
                                                            {copiedGroupIdx === idx ? <Check size={16} /> : <Copy size={16} />}
                                                        </button>
                                                        {isEditing && canEdit && (
                                                            <button type="button" className="btn-icon-move" onClick={() => setMoveGroupIdx(idx)} title="Move this group to another tour">
                                                                <ArrowRightFromLine size={16} />
                                                            </button>
                                                        )}
                                                        {canEdit && formData.groups.length > 1 && (
                                                            <button type="button" className="btn-icon-danger" onClick={() => removeGroup(idx)} title="Remove this group">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </header>
                                                <div className="form-row">
                                                    <div className="form-group primary-form-group">
                                                        <label>Group Name</label>
                                                        <input name="name" value={group.name} onChange={(e) => handleChange(e, idx)} placeholder="e.g. Cohen Family" />
                                                    </div>
                                                    <div className="form-group primary-form-group">
                                                        <label>Group Type</label>
                                                        <select name="type" value={group.type} onChange={(e) => handleChange(e, idx)}>
                                                            {configLoaded ? (
                                                                configData.groupTypes.map(type => (
                                                                    <option key={type.id} value={type.label}>{type.label}</option>
                                                                ))
                                                            ) : (
                                                                <>
                                                                    <option value="Individual/Family">Individual/Family</option>
                                                                    <option value="School">School</option>
                                                                    <option value="Day School" style={{ display: 'none' }}>School (legacy)</option>
                                                                    <option value="Organization">Organization</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="form-row counters">
                                                    <div className="form-group primary-form-group">
                                                        <label>Leader Name</label>
                                                        <input name="contact.leaderName" value={group.contact.leaderName} onChange={(e) => handleChange(e, idx)} />
                                                    </div>
                                                    <div className="form-group primary-form-group">
                                                        <label>Regular</label>
                                                        <input type="number" name="counts.regular" value={group.counts.regular} onChange={(e) => handleChange(e, idx)} min="0" />
                                                    </div>
                                                </div>
                                                <div className="form-row">
                                                    <div className="form-group primary-form-group">
                                                        <label>Leader Phone</label>
                                                        <input name="contact.leaderPhone" value={group.contact.leaderPhone} onChange={(e) => handleChange(e, idx)} />
                                                    </div>
                                                    <div className="form-group primary-form-group">
                                                        <label>Senior/Soldier</label>
                                                        <input type="number" name="counts.seniorSoldier" value={group.counts.seniorSoldier} onChange={(e) => handleChange(e, idx)} min="0" />
                                                    </div>
                                                </div>
                                                <div className="form-row counters">
                                                    <div className="form-group primary-form-group">
                                                        <label>Leader Email</label>
                                                        <input type="email" name="contact.leaderEmail" value={group.contact.leaderEmail} onChange={(e) => handleChange(e, idx)} />
                                                    </div>
                                                    <div className="form-group primary-form-group">
                                                        <label>Group (36₪)</label>
                                                        <input type="number" name="counts.group" value={group.counts.group || 0} onChange={(e) => handleChange(e, idx)} min="0" />
                                                    </div>
                                                </div>
                                                {/* <p className="contact-required-hint">* Phone or email required</p> */}
                                                <div className="form-row counters">
                                                    <div className="form-group primary-form-group">
                                                        <label>Status</label>
                                                        <select name="status" value={group.status} onChange={(e) => handleChange(e, idx)}>
                                                            {configLoaded ? (
                                                                configData.groupStatus.map(status => (
                                                                    <option key={status.id} value={status.label}>{status.label}</option>
                                                                ))
                                                            ) : (
                                                                <>
                                                                    <option value="Scheduled">Scheduled</option>
                                                                    <option value="Confirmed">Confirmed</option>
                                                                    <option value="Cancelled">Cancelled</option>
                                                                </>
                                                            )}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="external-guide-section">
                                                    <button type="button" className="external-guide-toggle" onClick={() => toggleExtGuide(idx)}>
                                                        <span>External Tour Guide <span className="optional-label">(Optional)</span></span>
                                                        <ChevronDown size={14} className={isExtGuideOpen(idx) ? 'chevron-open' : ''} />
                                                    </button>
                                                    {isExtGuideOpen(idx) && (
                                                        <div className="external-guide-fields">
                                                            <div className="form-row">
                                                                <div className="form-group primary-form-group">
                                                                    <label>Guide Name</label>
                                                                    <input name="contact.externalGuideName" value={group.contact.externalGuideName} onChange={(e) => handleChange(e, idx)} placeholder="External guide name" />
                                                                </div>
                                                                <div className="form-group primary-form-group">
                                                                    <label>Guide Phone</label>
                                                                    <input name="contact.externalGuidePhone" value={group.contact.externalGuidePhone} onChange={(e) => handleChange(e, idx)} placeholder="External guide phone" />
                                                                </div>
                                                            </div>
                                                            <div className="form-row">
                                                                <div className="form-group primary-form-group">
                                                                    <label>Guide Email</label>
                                                                    <input type="email" name="contact.externalGuideEmail" value={group.contact.externalGuideEmail} onChange={(e) => handleChange(e, idx)} placeholder="External guide email" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {canEdit && (
                                    <button type="button" className="btn-secondary add-group-btn" onClick={addGroup}>
                                        + Add Another Group
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'Booking & Payment' && (
                            <div className="tab-content">
                                <div className="workshop-indicator">
                                    <h3>Tour Configuration</h3>
                                    <div className="config-items">
                                        <span className={`config-badge ${formData.isWorkshop ? 'active' : 'inactive'}`}>
                                            Workshop: {formData.isWorkshop ? 'Included' : 'Not Included'}
                                        </span>
                                        <span className={`config-badge ${formData.isShiur ? 'active' : 'inactive'}`}>
                                            Shiur: {formData.isShiur ? 'Included' : 'Not Included'}
                                        </span>
                                    </div>
                                </div>
                                {formData.groups.map((group, idx) => {
                                    const calculation = calculateGroupPrice(group);
                                    const totalParticipants = (group.counts?.regular || 0) + (group.counts?.seniorSoldier || 0) + (group.counts?.child || 0) + (group.counts?.group || 0);

                                    return (
                                        <div key={idx} className="payment-group-summary">
                                            <h4>{group.name} - Payment Details</h4>
                                            <div className="participants-breakdown">
                                                <div className="breakdown-grid">
                                                    <div className="breakdown-item">
                                                        <span className="breakdown-label">Adults ({calculation.currency}{configData.pricing?.basePrices?.regular || 40} each)</span>
                                                        <span className="breakdown-value">{group.counts?.regular || 0}</span>
                                                    </div>
                                                    <div className="breakdown-item">
                                                        <span className="breakdown-label">Seniors/Soldiers ({calculation.currency}{configData.pricing?.basePrices?.seniorSoldier || 30} each)</span>
                                                        <span className="breakdown-value">{group.counts?.seniorSoldier || 0}</span>
                                                    </div>
                                                    <div className="breakdown-item">
                                                        <span className="breakdown-label">Group ({calculation.currency}{configData.pricing?.basePrices?.group || 36} each)</span>
                                                        <span className="breakdown-value">{group.counts?.group || 0}</span>
                                                    </div>
                                                    <div className="breakdown-item total">
                                                        <span className="breakdown-label">Total Participants</span>
                                                        <span className="breakdown-value">{totalParticipants}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {totalParticipants > 0 && (
                                                <div className="price-calculation">
                                                    <h5>Price Breakdown</h5>
                                                    <div className="calc-breakdown">
                                                        {(group.counts?.regular || 0) > 0 && (
                                                            <div className="calc-line">
                                                                <span>Adults: {group.counts.regular} × {calculation.currency}{configData.pricing?.basePrices?.regular || 40}</span>
                                                                <span>{calculation.currency}{calculation.regularCost}</span>
                                                            </div>
                                                        )}
                                                        {(group.counts?.seniorSoldier || 0) > 0 && (
                                                            <div className="calc-line">
                                                                <span>Seniors/Soldiers: {group.counts.seniorSoldier} × {calculation.currency}{configData.pricing?.basePrices?.seniorSoldier || 30}</span>
                                                                <span>{calculation.currency}{calculation.seniorCost}</span>
                                                            </div>
                                                        )}
                                                        {(group.counts?.group || 0) > 0 && (
                                                            <div className="calc-line">
                                                                <span>Group: {group.counts.group} × {calculation.currency}{configData.pricing?.basePrices?.group || 36}</span>
                                                                <span>{calculation.currency}{calculation.groupCost}</span>
                                                            </div>
                                                        )}
                                                        {formData.isWorkshop && totalParticipants > 0 && (
                                                            <div className="calc-line">
                                                                <span>Workshop: {Math.floor(totalParticipants / 5 + 1)} sessions × {calculation.currency}{configData.pricing?.basePrices?.workshop || 200}</span>
                                                                <span>{calculation.currency}{calculation.workshopCost}</span>
                                                            </div>
                                                        )}
                                                        <div className="calc-line subtotal">
                                                            <span>Subtotal</span>
                                                            <span>{calculation.currency}{calculation.subtotal}</span>
                                                        </div>
                                                        {calculation.discount > 0 && (
                                                            <div className="calc-line discount">
                                                                <span>{calculation.discountReason}</span>
                                                                <span>-{calculation.currency}{Math.round(calculation.discount)}</span>
                                                            </div>
                                                        )}
                                                        <div className="calc-line total">
                                                            <span>Calculated Total</span>
                                                            <span>{calculation.currency}{calculation.finalPrice}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn-secondary calc-btn"
                                                        onClick={() => handleCalculatePrice(idx)}
                                                        disabled={!canEdit}
                                                    >
                                                        Use Calculated Price
                                                    </button>
                                                </div>
                                            )}

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Booking Source</label>
                                                    <select
                                                        name="booking.source"
                                                        value={formData.groups[idx].booking.source_is_other ? 'Other' : (formData.groups[idx].booking.source === '' ? '' : (configData.bookingSources.some(s => s.label === formData.groups[idx].booking.source) ? formData.groups[idx].booking.source : 'Other'))}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === 'Other') {
                                                                // Clear source and mark as other
                                                                handleChange({ target: { name: 'booking.source', value: '' } }, idx);
                                                                handleChange({ target: { name: 'booking.source_is_other', value: true } }, idx);
                                                            } else {
                                                                handleChange({ target: { name: 'booking.source_is_other', value: false } }, idx);
                                                                handleChange(e, idx);
                                                            }
                                                        }}
                                                    >
                                                        <option value="">Select Source</option>
                                                        {configData.bookingSources.map(source => (
                                                            <option key={source.id} value={source.label}>{source.label}</option>
                                                        ))}
                                                        <option value="Other">Other (custom)</option>
                                                    </select>
                                                </div>
                                                {(formData.groups[idx].booking.source_is_other || (formData.groups[idx].booking.source && !configData.bookingSources.some(s => s.label === formData.groups[idx].booking.source))) && (
                                                    <div className="form-group">
                                                        <label>External Source Detail</label>
                                                        <input
                                                            name="booking.source"
                                                            value={formData.groups[idx].booking.source}
                                                            onChange={(e) => handleChange(e, idx)}
                                                            placeholder="Specify other source..."
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}
                                                <div className="form-group">
                                                    <label>Total Cost (₪) - Manual Override</label>
                                                    <input type="number" name="booking.totalCost" value={group.booking.totalCost} onChange={(e) => handleChange(e, idx)} min="0" placeholder="Enter custom amount or use calculated price" />
                                                </div>
                                            </div>
                                            <div className="form-row checkboxes">
                                                <label className="checkbox-label">
                                                    <input type="checkbox" name="booking.paymentLinkSent" checked={group.booking.paymentLinkSent} onChange={(e) => handleChange(e, idx)} />
                                                    <span>Payment Link Sent</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input type="checkbox" name="booking.prepaid" checked={group.booking.prepaid} onChange={(e) => handleChange(e, idx)} />
                                                    <span>Prepaid</span>
                                                </label>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Payment Status</label>
                                                    <select
                                                        name="postVisit.paymentStatus"
                                                        value={group.postVisit?.paymentStatus || 'Pending'}
                                                        onChange={(e) => handleChange(e, idx)}
                                                    >
                                                        {configLoaded && configData.paymentStatus?.length > 0 ? (
                                                            configData.paymentStatus.map(status => (
                                                                <option key={status.id} value={status.label}>{status.label}</option>
                                                            ))
                                                        ) : (
                                                            <>
                                                                <option value="Pending">Pending</option>
                                                                <option value="Paid">Paid</option>
                                                                <option value="Partial">Partial</option>
                                                                <option value="Cancelled">Cancelled</option>
                                                                <option value="Refunded">Refunded</option>
                                                            </>
                                                        )}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Payment Notes</label>
                                                <textarea
                                                    name="booking.notes"
                                                    value={group.booking.notes || ''}
                                                    onChange={(e) => handleChange(e, idx)}
                                                    rows="3"
                                                    placeholder="Add any payment-related notes, special arrangements, or comments for this group..."
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="total-tour-summary">
                                    <h3>Tour Total</h3>
                                    <div className="total-amount">
                                        ₪{formData.groups.reduce((sum, g) => sum + (g.booking.totalCost || 0), 0)}
                                    </div>
                                    <div className="total-participants">
                                        Total Participants: {formData.groups.reduce((sum, g) => sum + (g.counts?.regular || 0) + (g.counts?.seniorSoldier || 0) + (g.counts?.child || 0), 0)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Post-Tour' && (
                            <div className="tab-content post-tour-content">
                                <div className="post-tour-header">
                                    <p className="helper-text">Fill out these details after the tour has been completed.</p>
                                </div>

                                {formData.groups.map((group, idx) => (
                                    <div key={idx} className="group-card post-tour-group">
                                        <header className="group-card-header">
                                            <h4>{group.name || `Group ${idx + 1}`} - Post-Tour</h4>
                                        </header>

                                        <div className="post-tour-grid">
                                            <div className="post-tour-column">

                                                <div className="form-section">
                                                    <h5>Donation</h5>
                                                    <div className="form-group">
                                                        <label>Donation Amount ($)</label>
                                                        <input
                                                            type="text"
                                                            name="postVisit.donation.amount"
                                                            value={group.postVisit?.donation?.amount || ''}
                                                            onChange={(e) => handleChange(e, idx)}
                                                            placeholder="e.g. $50, pending, check received..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="post-tour-column">
                                                <div className="form-section">
                                                    <h5>Review & Follow-up</h5>
                                                    <div className="form-row checkboxes">
                                                        <label className="checkbox-label">
                                                            <input
                                                                type="checkbox"
                                                                name="postVisit.reviewRequested"
                                                                checked={group.postVisit?.reviewRequested || false}
                                                                onChange={(e) => handleChange(e, idx)}
                                                            />
                                                            <span>Review Requested</span>
                                                        </label>
                                                    </div>


                                                </div>

                                                <div className="form-section">
                                                    <h5>Visit Documentation</h5>
                                                    <div className="form-group">
                                                        <label htmlFor={`incidents-${idx}`}>Positive / Negative notes & incidents</label>
                                                        <textarea
                                                            id={`incidents-${idx}`}
                                                            name="visitDetails.incidents"
                                                            value={group.visitDetails?.incidents || ''}
                                                            onChange={(e) => handleChange(e, idx)}
                                                            rows="3"
                                                            placeholder="Record any incidents, special moments, or important notes from the tour..."
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label htmlFor={`mediaLinks-${idx}`}>Media Links</label>
                                                        <textarea
                                                            id={`mediaLinks-${idx}`}
                                                            name="visitDetails.mediaLinks"
                                                            value={Array.isArray(group.visitDetails?.mediaLinks) ? group.visitDetails.mediaLinks.join('\n') : ''}
                                                            onChange={(e) => {
                                                                const links = e.target.value.split('\n').map(link => link.trim()).filter(link => link);
                                                                handleChange({ target: { name: 'visitDetails.mediaLinks', value: links } }, idx);
                                                            }}
                                                            rows="3"
                                                            placeholder="Add media links (photos, videos) - one per line..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </fieldset>

                </form>
            </div>
        {moveGroupIdx !== null && (
            <MoveGroupModal
                group={formData.groups[moveGroupIdx]}
                sourceTourId={formData._id}
                sourceTourDate={formData.date}
                sourceTourStartTime={formData.startTime}
                sourceTourEndTime={formData.endTime}
                sourceTourGroupCount={formData.groups.length}
                allTours={allTours}
                onConfirm={handleMoveConfirm}
                onCancel={() => setMoveGroupIdx(null)}
            />
        )}
        </div>
    );
};

export default TourForm;
