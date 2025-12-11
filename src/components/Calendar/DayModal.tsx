import React, { useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { Clock, Link as LinkIcon, StickyNote, X } from 'lucide-react';

interface DayModalProps {
    date: Date;
    onClose: () => void;
}

export const DayModal: React.FC<DayModalProps> = ({ date, onClose }) => {
    const { events, viewMode } = useCalendarStore();
    const dateStr = formatDate(date);

    const dayEvents = useMemo(() => {
        const list = events[dateStr] || [];
        return [...list].sort((a, b) => {
            const tA = a.startTime || '';
            const tB = b.startTime || '';
            if (tA !== tB) return tA.localeCompare(tB);
            return a.title.localeCompare(b.title);
        });
    }, [events, dateStr]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-[#0c0f14] border border-white/20 shadow-2xl relative">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                    <div>
                        <div className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">Day Overview</div>
                        <div className="text-xl text-white tracking-[0.2em]">{dateStr} <span className="text-[10px] text-slate-600">v1.1</span></div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto p-4 flex flex-col gap-3">
                    {dayEvents.length === 0 && (
                        <div className="text-xs font-mono text-slate-500">No events yet.</div>
                    )}
                    {dayEvents.map((ev) => (
                        <div key={ev.id} className="border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white font-mono">{ev.title}</div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {ev.startTime || (ev as any).start_time || '--:--'}
                                    </span>
                                    {viewMode === 'friend' && (
                                        <span className="text-[10px] uppercase text-[#d4af37]">Read-only</span>
                                    )}
                                </div>
                            </div>
                            {ev.note && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                                    <StickyNote className="w-3 h-3" /> {ev.note}
                                </div>
                            )}
                            {ev.link && (
                                <a href={ev.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-sky-300 underline">
                                    <LinkIcon className="w-3 h-3" /> {ev.link}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
