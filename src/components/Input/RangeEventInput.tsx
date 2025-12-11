import React, { useState, useEffect, useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { eachDayOfInterval, format } from 'date-fns';
import { X, Terminal, ShieldAlert } from 'lucide-react';

export const RangeEventInput: React.FC = () => {
    const { selection, selectionActive, addEventsToRange, clearSelection, viewMode, viewingUsername } = useCalendarStore();
    const [isOpen, setIsOpen] = useState(false);
    const [eventMap, setEventMap] = useState<Record<string, { title?: string; time?: string; link?: string; note?: string }>>({});

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

    const handleInputChange = (dateStr: string, key: 'title' | 'time' | 'link' | 'note', value: string) => {
        setEventMap(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], [key]: value } }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = days.map(day => {
            const entry = eventMap[day.toISOString()] || {};
            return {
                title: entry.title || '',
                startTime: entry.time || '',
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pointer-events-none bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl pointer-events-auto bg-[#0c0f14] border border-white/20 shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10 duration-500">

                {/* Console Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-[#d4af37]" />
                        <span className="text-xs font-mono text-[#d4af37] tracking-widest">SEQUENCE_INPUT_CONSOLE</span>
                    </div>
                    <button onClick={handleClose} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Data Grid */}
                <div className="overflow-y-auto p-6 custom-scrollbar bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]">
                    <form id="sequence-form" onSubmit={handleSubmit} className="flex flex-col gap-1">
                        {days.map((day, index) => {
                            const dateKey = day.toISOString();
                            const entry = eventMap[dateKey] || {};

                            return (
                                <div key={dateKey} className="flex items-center gap-4 font-mono text-sm group">
                                    <div className="w-8 text-right text-slate-600 group-hover:text-[#d4af37]">
                                        {String(index).padStart(2, '0')}
                                    </div>

                                    <div className="text-[#d4af37] opacity-70 w-24">
                                        {format(day, 'yyyy-MM-dd')}
                                    </div>

                                    <div className="flex-1 flex flex-col gap-2">
                                        <div className="border-b border-white/10 group-hover:border-[#d4af37]/50 transition-colors">
                                            <input
                                                type="text"
                                                value={entry.title || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'title', e.target.value)}
                                                placeholder="Title or Meeting name"
                                                className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-700 disabled:opacity-50"
                                                disabled={isReadOnly}
                                                autoFocus={index === 0}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <input
                                                type="time"
                                                value={entry.time || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'time', e.target.value)}
                                                className="bg-white/5 border border-white/10 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-[#d4af37] disabled:opacity-50"
                                                disabled={isReadOnly}
                                            />
                                            <input
                                                type="url"
                                                value={entry.link || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'link', e.target.value)}
                                                placeholder="Link (optional)"
                                                className="bg-white/5 border border-white/10 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-[#d4af37] disabled:opacity-50"
                                                disabled={isReadOnly}
                                            />
                                            <input
                                                type="text"
                                                value={entry.note || ''}
                                                onChange={(e) => handleInputChange(dateKey, 'note', e.target.value)}
                                                placeholder="Note"
                                                className="bg-white/5 border border-white/10 text-xs text-slate-200 px-2 py-1 focus:outline-none focus:border-[#d4af37] disabled:opacity-50"
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
                <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center">
                    <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                        {isReadOnly ? (
                            <>
                                <ShieldAlert className="w-4 h-4 text-[#d4af37]" />
                                VIEW-ONLY MODE: {viewingUsername || 'Friend'}
                            </>
                        ) : (
                            'STATUS: WAITING_FOR_EXECUTION'
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white border border-transparent hover:border-white/20 transition-all uppercase"
                        >
                            [ Cancel ]
                        </button>
                        {!isReadOnly && (
                            <button
                                type="submit"
                                form="sequence-form"
                                className="px-6 py-2 bg-[#d4af37] text-black text-xs font-mono font-bold hover:bg-[#b5952f] transition-colors uppercase tracking-wider"
                            >
                                [ Execute Sequence ]
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
