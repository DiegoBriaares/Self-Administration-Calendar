import React, { useState, useEffect, useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { eachDayOfInterval, format } from 'date-fns';
import { X, Terminal, ShieldAlert } from 'lucide-react';

export const RangeEventInput: React.FC = () => {
    const { selection, selectionActive, addEventsToRange, clearSelection, viewMode, viewingUsername } = useCalendarStore();
    const [isOpen, setIsOpen] = useState(false);
    const [eventMap, setEventMap] = useState<Record<string, { title?: string; time?: string; link?: string; note?: string; priority?: string }>>({});

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
    };

    const handleClose = () => {
        clearSelection();
        setEventMap({});
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
