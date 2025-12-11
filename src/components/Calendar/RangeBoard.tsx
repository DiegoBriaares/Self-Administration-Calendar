import React, { useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { eachDayOfInterval } from 'date-fns';
import { CalendarRange, Clock } from 'lucide-react';

export const RangeBoard: React.FC = () => {
    const { selection, events, viewMode } = useCalendarStore();
    const hasSelection = selection.start && selection.end;

    const rangeEvents = useMemo(() => {
        if (!selection.start || !selection.end) return [];
        const start = selection.start < selection.end ? selection.start : selection.end;
        const end = selection.start < selection.end ? selection.end : selection.start;
        const days = eachDayOfInterval({ start, end });
        const merged: Array<{ date: string; title: string; startTime?: string | null; note?: string | null; link?: string | null; id: string }> = [];
        days.forEach((day) => {
            const dateStr = formatDate(day);
            (events[dateStr] || []).forEach((ev) => {
                merged.push({ ...ev, date: dateStr });
            });
        });
        merged.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';
            if (timeA !== timeB) return timeA.localeCompare(timeB);
            return a.title.localeCompare(b.title);
        });
        return merged;
    }, [selection.start, selection.end, events]);

    if (!hasSelection || rangeEvents.length === 0) return null;

    const rangeLabel = selection.start && selection.end
        ? `${formatDate(selection.start < selection.end ? selection.start : selection.end)} → ${formatDate(selection.start < selection.end ? selection.end : selection.start)}`
        : '';

    return (
        <div className="w-full border border-white/10 bg-[#0c0f14] p-4 mt-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-[var(--accent)]" />
                    <div className="text-sm font-mono text-white tracking-[0.2em] uppercase">Range Overview</div>
                </div>
                <div className="text-[11px] font-mono text-slate-400">{rangeLabel}</div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
                {rangeEvents.map((ev) => (
                    <div key={ev.id} className="border border-white/10 bg-white/5 p-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono">{ev.date}</span>
                            {ev.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.startTime}</span>}
                            {viewMode === 'friend' && <span className="text-[10px] uppercase text-[#d4af37]">Read-only</span>}
                        </div>
                        <div className="text-white text-sm font-mono truncate">{ev.title}</div>
                        {ev.note && <div className="text-[11px] text-slate-300 truncate">{ev.note}</div>}
                        {ev.link && (
                            <a href={ev.link} target="_blank" rel="noreferrer" className="text-[11px] text-sky-300 underline">
                                {ev.link}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
