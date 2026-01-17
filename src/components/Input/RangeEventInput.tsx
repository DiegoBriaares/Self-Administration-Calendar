import React, { useState, useEffect, useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { eachDayOfInterval, format } from 'date-fns';
import { X, Terminal, ShieldAlert } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export const RangeEventInput: React.FC = () => {
    const { selection, selectionActive, addEventsToRange, clearSelection, viewMode, viewingUsername, events, addEventsBulk } = useCalendarStore();
    const [isOpen, setIsOpen] = useState(false);
    const [eventMap, setEventMap] = useState<Record<string, { title?: string; time?: string; link?: string; note?: string; priority?: string }>>({});
    const [copySourceDate, setCopySourceDate] = useState('');
    const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);

    const days = useMemo(() => {
        if (!selection.start || !selection.end) return [];
        const start = selection.start < selection.end ? selection.start : selection.end;
        const end = selection.start < selection.end ? selection.end : selection.start;
        return eachDayOfInterval({ start, end });
    }, [selection]);

    useEffect(() => {
        const isMultiDay = days.length > 1;
        if (selection.start && selection.end && isMultiDay && !selectionActive) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                setEventMap({});
            }, 150); // short delay to allow drag to finish
            return () => clearTimeout(timer);
        } else {
            setIsOpen(false);
        }
    }, [selection, days.length, selectionActive]);

    useEffect(() => {
        if (!isOpen) return;
        if (days.length === 0) return;
        const defaultSource = formatDate(days[0]);
        setCopySourceDate(defaultSource);
        setSelectedCopyIds([]);
    }, [isOpen, days]);

    if (!isOpen || days.length === 0) return null;

    const isReadOnly = viewMode === 'friend';

    const handleInputChange = (dateStr: string, key: 'title' | 'time' | 'link' | 'note' | 'priority', value: string) => {
        setEventMap(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], [key]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = days.map(day => {
            const entry = eventMap[day.toISOString()] || {};
            return {
                title: entry.title || '',
                startTime: entry.time || '',
                priority: entry.priority || '',
                link: entry.link || '',
                note: entry.note || ''
            };
        });
        addEventsToRange(payload as any);
        clearSelection();
        setEventMap({});
        setSelectedCopyIds([]);
    };

    const handleClose = () => {
        clearSelection();
        setEventMap({});
        setSelectedCopyIds([]);
    };

    const sourceEvents = useMemo(() => {
        if (!copySourceDate) return [];
        const list = events[copySourceDate] || [];
        return [...list].sort((a, b) => {
            const tA = a.startTime || '';
            const tB = b.startTime || '';
            if (tA !== tB) return tA.localeCompare(tB);
            const pA = a.priority ?? Number.MAX_SAFE_INTEGER;
            const pB = b.priority ?? Number.MAX_SAFE_INTEGER;
            if (pA !== pB) return pA - pB;
            return a.title.localeCompare(b.title);
        });
    }, [events, copySourceDate]);

    const allSelected = sourceEvents.length > 0 && selectedCopyIds.length === sourceEvents.length;

    const toggleCopySelection = (id: string) => {
        setSelectedCopyIds((prev) => (
            prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
        ));
    };

    const handleCopySelectAll = () => {
        if (sourceEvents.length === 0) return;
        setSelectedCopyIds(allSelected ? [] : sourceEvents.map((event) => event.id));
    };

    const handleCopyEvents = async () => {
        if (isReadOnly || !copySourceDate) return;
        const selectedEvents = sourceEvents.filter((event) => selectedCopyIds.includes(event.id));
        if (selectedEvents.length === 0) return;
        const targetDates = days
            .map((day) => formatDate(day))
            .filter((date) => date !== copySourceDate);
        if (targetDates.length === 0) return;
        const payload = targetDates.flatMap((date) => (
            selectedEvents.map((event) => {
                const chain: string[] = [];
                (event.originDates || []).forEach((origin) => {
                    if (origin && !chain.includes(origin)) {
                        chain.push(origin);
                    }
                });
                if (copySourceDate && !chain.includes(copySourceDate)) {
                    chain.push(copySourceDate);
                }
                if (!chain.includes(date)) {
                    chain.push(date);
                }
                return {
                    title: event.title,
                    date,
                    startTime: event.startTime ?? null,
                    priority: event.priority ?? null,
                    link: event.link ?? null,
                    note: event.note ?? null,
                    originDates: chain.length > 0 ? chain : null
                };
            })
        ));
        await addEventsBulk(payload);
        clearSelection();
        setEventMap({});
        setSelectedCopyIds([]);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pointer-events-none bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl pointer-events-auto bg-white/95 backdrop-blur-xl border border-orange-200 shadow-2xl shadow-orange-200/50 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 duration-500 rounded-2xl overflow-hidden">

                {/* Console Header */}
                <div className="flex items-center justify-between p-4 border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-orange-600" />
                        <span className="text-xs font-mono text-orange-600 tracking-widest font-medium">SEQUENCE_INPUT_CONSOLE</span>
                    </div>
                    <button onClick={handleClose} className="text-stone-400 hover:text-stone-600 transition-colors p-1 hover:bg-orange-100 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Data Grid */}
                <div className="overflow-y-auto p-6 custom-scrollbar bg-[linear-gradient(rgba(251,146,60,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.05)_1px,transparent_1px)] bg-[size:20px_20px]">
                    <div className="mb-5 border border-orange-200 bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.3em]">Day Events Management</div>
                            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                                <label htmlFor="copy-source-date" className="tracking-[0.2em]">Source</label>
                                <select
                                    id="copy-source-date"
                                    value={copySourceDate}
                                    onChange={(e) => {
                                        setCopySourceDate(e.target.value);
                                        setSelectedCopyIds([]);
                                    }}
                                    disabled={isReadOnly}
                                    className="border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-stone-600 bg-white disabled:opacity-60"
                                >
                                    {days.map((day) => {
                                        const key = formatDate(day);
                                        return (
                                            <option key={key} value={key}>
                                                {key}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            {sourceEvents.length === 0 ? (
                                <div className="text-xs text-stone-400 font-mono">
                                    No events to copy for the selected day.
                                </div>
                            ) : (
                                sourceEvents.map((event) => (
                                    <label
                                        key={event.id}
                                        className="flex items-center gap-3 border border-orange-100 rounded-lg px-3 py-2 hover:border-orange-300 bg-white transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCopyIds.includes(event.id)}
                                            onChange={() => toggleCopySelection(event.id)}
                                            disabled={isReadOnly}
                                            className="h-4 w-4 accent-orange-500 disabled:opacity-60"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-stone-700 font-medium truncate">{event.title}</div>
                                            <div className="text-[11px] text-stone-500 font-mono truncate">
                                                {(event.startTime && event.startTime.trim() !== '' ? event.startTime : '--:--')} · {event.priority !== null && event.priority !== undefined ? `P${event.priority}` : '--'}
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleCopySelectAll}
                                disabled={isReadOnly || sourceEvents.length === 0}
                                className="px-3 py-1.5 text-[11px] font-mono border border-orange-200 rounded-lg text-stone-500 hover:text-stone-700 hover:border-orange-400 disabled:opacity-50"
                            >
                                {allSelected ? 'None' : 'All'}
                            </button>
                            <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                                Selected {selectedCopyIds.length}
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyEvents}
                                disabled={isReadOnly || selectedCopyIds.length === 0}
                                className="px-4 py-2 bg-orange-400 text-white text-xs font-mono font-bold hover:bg-orange-500 transition-colors rounded-lg disabled:opacity-50"
                            >
                                Copy Selected
                            </button>
                        </div>
                    </div>
                    <form id="sequence-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {days.map((day, index) => {
                            const dateKey = day.toISOString();
                            const entry = eventMap[dateKey] || {};

                            return (
                                <div key={dateKey} className="flex items-start gap-4 font-mono text-sm group p-3 bg-white rounded-xl border border-orange-100 shadow-sm hover:border-orange-300 transition-all">
                                    <div className="w-8 text-right text-stone-400 group-hover:text-orange-500 pt-2 font-medium">
                                        {String(index).padStart(2, '0')}
                                    </div>

                                    <div className="text-orange-600 w-24 pt-2 font-medium">
                                        {format(day, 'yyyy-MM-dd')}
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3">
                                        <input
                                            type="text"
                                            value={entry.title || ''}
                                            onChange={(e) => handleInputChange(dateKey, 'title', e.target.value)}
                                            placeholder="Title or Meeting name"
                                            className="w-full bg-white border-2 border-orange-200 rounded-lg px-3 py-2 text-stone-800 placeholder:text-stone-400 disabled:opacity-50 focus:outline-none focus:border-orange-400 transition-colors"
                                            disabled={isReadOnly}
                                            autoFocus={index === 0}
                                        />
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                            <input
                                                type="time"
                                                value={entry.time || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'time', e.target.value)}
                                                className="bg-white border-2 border-orange-200 text-sm text-stone-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 disabled:opacity-50"
                                                disabled={isReadOnly}
                                            />
                                            <input
                                                type="number"
                                                step="1"
                                                value={entry.priority || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'priority', e.target.value)}
                                                placeholder="Priority"
                                                className="bg-white border-2 border-orange-200 text-sm text-stone-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 disabled:opacity-50 placeholder:text-stone-400"
                                                disabled={isReadOnly}
                                            />
                                            <input
                                                type="url"
                                                value={entry.link || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'link', e.target.value)}
                                                placeholder="Link (optional)"
                                                className="bg-white border-2 border-orange-200 text-sm text-stone-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 disabled:opacity-50 placeholder:text-stone-400"
                                                disabled={isReadOnly}
                                            />
                                            <input
                                                type="text"
                                                value={entry.note || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'note', e.target.value)}
                                                placeholder="Note"
                                                className="bg-white border-2 border-orange-200 text-sm text-stone-700 px-2 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 disabled:opacity-50 placeholder:text-stone-400"
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </form>
                </div>

                {/* Console Footer */}
                <div className="p-4 border-t border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 flex justify-between items-center">
                    <div className="text-[10px] font-mono text-stone-500 flex items-center gap-2">
                        {isReadOnly ? (
                            <>
                                <ShieldAlert className="w-4 h-4 text-orange-500" />
                                VIEW-ONLY MODE: {viewingUsername || 'Friend'}
                            </>
                        ) : (
                            <span className="text-orange-600">STATUS: WAITING_FOR_EXECUTION</span>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 border border-stone-300 hover:border-stone-400 transition-all rounded-xl"
                        >
                            Cancel
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                form="sequence-form"
                                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium font-mono hover:from-orange-600 hover:to-amber-600 transition-all rounded-xl shadow-lg shadow-orange-300/50"
                            >
                                Execute Sequence
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
