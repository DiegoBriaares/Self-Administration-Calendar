import React, { useMemo } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { eachDayOfInterval } from 'date-fns';
import { CalendarRange, Clock } from 'lucide-react';

export const RangeBoard: React.FC = () => {
    const { selection, events, viewMode } = useCalendarStore();
    const hasSelection = selection.start && selection.end;
    const [sortOrder, setSortOrder] = React.useState<'time' | 'priority'>('time');

    const rangeEvents = useMemo(() => {
        if (!selection.start || !selection.end) return [];
        const start = selection.start < selection.end ? selection.start : selection.end;
        const end = selection.start < selection.end ? selection.end : selection.start;
        const days = eachDayOfInterval({ start, end });
        const merged: Array<{ date: string; title: string; startTime?: string | null; priority?: number | null; note?: string | null; link?: string | null; id: string }> = [];
        days.forEach((day) => {
            const dateStr = formatDate(day);
            (events[dateStr] || []).forEach((ev) => {
                merged.push({ ...ev, date: dateStr });
            });
        });
        const priorityValue = (value?: number | null) => {
            if (value === null || value === undefined) return Number.MAX_SAFE_INTEGER;
            return value;
        };
        merged.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            if (sortOrder === 'priority') {
                const pA = priorityValue(a.priority);
                const pB = priorityValue(b.priority);
                if (pA !== pB) return pA - pB;
            }
            const timeA = a.startTime || '';
            const timeB = b.startTime || '';
            if (timeA !== timeB) return timeA.localeCompare(timeB);
            if (sortOrder !== 'priority') {
                const pA = priorityValue(a.priority);
                const pB = priorityValue(b.priority);
                if (pA !== pB) return pA - pB;
            }
            return a.title.localeCompare(b.title);
        });
        return merged;
    }, [selection.start, selection.end, events, sortOrder]);

    if (!hasSelection || rangeEvents.length === 0) return null;

    const rangeLabel = selection.start && selection.end
        ? `${formatDate(selection.start < selection.end ? selection.start : selection.end)} → ${formatDate(selection.start < selection.end ? selection.end : selection.start)}`
        : '';

    return (
        <div className="w-full board-panel p-5 mt-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-orange-500" />
                    <div className="text-sm font-medium text-stone-800 tracking-[0.15em] uppercase">Range Overview</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-sm font-mono text-orange-600">{rangeLabel}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                        <label htmlFor="range-order" className="tracking-[0.2em]">Order</label>
                        <select
                            id="range-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'time' | 'priority')}
                            className="border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-stone-600 bg-white"
                        >
                            <option value="time">Hour</option>
                            <option value="priority">Priority</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {rangeEvents.map((ev) => (
                    <div key={ev.id} className="board-card flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm text-stone-500 flex-wrap gap-2">
                            <span className="font-mono text-orange-600">{ev.date}</span>
                            <span className="pill-soft flex items-center gap-1">
                                <Clock className="w-3 h-3 text-orange-500" /> {(ev.startTime && ev.startTime.trim() !== '' ? ev.startTime : '--:--')} · {ev.priority !== null && ev.priority !== undefined ? `P${ev.priority}` : '--'}
                            </span>
                            {viewMode === 'friend' && <span className="pill-soft text-sm uppercase">Read-only</span>}
                        </div>
                        <div className="text-stone-800 dark:text-slate-100 text-sm font-medium truncate">{ev.title}</div>
                        {ev.note && <div className="text-sm text-stone-500 dark:text-slate-300 truncate">{ev.note}</div>}
                        {ev.link && (
                            <a href={ev.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:text-blue-700 underline truncate">
                                {ev.link}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
