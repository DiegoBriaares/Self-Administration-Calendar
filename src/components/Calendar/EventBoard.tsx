import React, { useState, useMemo } from 'react';
import { useCalendarStore, type CalendarEvent } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { Clock, Link as LinkIcon, StickyNote, Trash2, Edit3, Plus } from 'lucide-react';

interface EventBoardProps {
    selectedDate: Date | null;
}

export const EventBoard: React.FC<EventBoardProps> = ({ selectedDate }) => {
    const { events, viewMode, addEvent, deleteEvent, editEvent } = useCalendarStore();
    const [draft, setDraft] = useState({ title: '', time: '', link: '', note: '', priority: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'time' | 'priority'>('time');
    if (!selectedDate) return null;

    const dateStr = formatDate(selectedDate);
    const dayEvents = useMemo(() => {
        const list = events[dateStr] || [];
        const priorityValue = (value?: number | null) => {
            if (value === null || value === undefined) return Number.MAX_SAFE_INTEGER;
            return value;
        };
        return [...list].sort((a, b) => {
            if (sortOrder === 'priority') {
                const pA = priorityValue(a.priority);
                const pB = priorityValue(b.priority);
                if (pA !== pB) return pA - pB;
            }
            const tA = a.startTime || '';
            const tB = b.startTime || '';
            if (tA !== tB) return tA.localeCompare(tB);
            if (sortOrder !== 'priority') {
                const pA = priorityValue(a.priority);
                const pB = priorityValue(b.priority);
                if (pA !== pB) return pA - pB;
            }
            return a.title.localeCompare(b.title);
        });
    }, [events, dateStr, sortOrder]);

    const getMetaLabel = (event: CalendarEvent) => {
        const timeLabel = event.startTime && event.startTime.trim() !== '' ? event.startTime : '--:--';
        const priorityLabel = event.priority !== null && event.priority !== undefined ? `P${event.priority}` : '--';
        return `${timeLabel} · ${priorityLabel}`;
    };

    const parsePriority = (value: string) => {
        if (!value) return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
    };

    return (
        <div className="w-full board-panel p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div>
                    <div className="text-[10px] font-mono text-stone-500 tracking-[0.25em] uppercase">Day Log</div>
                    <div className="text-xl text-stone-800 tracking-[0.2em]">{dateStr}</div>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500 uppercase">
                    <label className="tracking-[0.2em]" htmlFor="event-order">Order</label>
                    <select
                        id="event-order"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'time' | 'priority')}
                        className="bg-white border border-orange-200 text-[11px] text-stone-700 px-2 py-1 focus:outline-none focus:border-orange-400 rounded-lg"
                    >
                        <option value="time">Hour</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
                {viewMode === 'friend' && (
                    <span className="text-[10px] font-mono text-orange-500 uppercase">Read-only</span>
                )}
            </div>

            {dayEvents.length === 0 ? (
                <div className="text-xs text-stone-500 font-mono">No entries. Add one below.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dayEvents.map((event: CalendarEvent) => (
                        <div key={event.id} className="board-card flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-stone-800 font-mono">{event.title}</div>
                                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getMetaLabel(event)}</span>
                                    {viewMode !== 'friend' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingId(event.id);
                                                    setDraft({
                                                        title: event.title || '',
                                                        time: event.startTime || '',
                                                        priority: event.priority !== null && event.priority !== undefined ? String(event.priority) : '',
                                                        link: event.link || '',
                                                        note: event.note || ''
                                                    });
                                                }}
                                                className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-[11px]"
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => deleteEvent(event.id)}
                                                className="text-red-500 hover:text-red-600 flex items-center gap-1 text-[11px]"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {event.note && (
                                <div className="flex items-center gap-2 text-[11px] text-stone-500">
                                    <StickyNote className="w-3 h-3" /> {event.note}
                                </div>
                            )}
                            {event.link && (
                                <a href={event.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-blue-600 underline">
                                    <LinkIcon className="w-3 h-3" /> {event.link}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {viewMode !== 'friend' && (
                <div className="mt-4 border-t border-orange-100 pt-4">
                    <div className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.25em] mb-2">Create / Update</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input
                            type="text"
                            value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                            placeholder="Title"
                            className="bg-white border border-orange-200 text-sm text-stone-800 px-3 py-2 focus:outline-none focus:border-orange-400"
                        />
                        <input
                            type="time"
                            value={draft.time}
                            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                            className="bg-white border border-orange-200 text-sm text-stone-800 px-3 py-2 focus:outline-none focus:border-orange-400"
                        />
                        <input
                            type="number"
                            step="1"
                            value={draft.priority}
                            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                            placeholder="Priority"
                            className="bg-white border border-orange-200 text-sm text-stone-800 px-3 py-2 focus:outline-none focus:border-orange-400"
                        />
                        <input
                            type="url"
                            value={draft.link}
                            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                            placeholder="Link"
                            className="bg-white border border-orange-200 text-sm text-stone-800 px-3 py-2 focus:outline-none focus:border-orange-400"
                        />
                        <input
                            type="text"
                            value={draft.note}
                            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                            placeholder="Note"
                            className="bg-white border border-orange-200 text-sm text-stone-800 px-3 py-2 focus:outline-none focus:border-orange-400"
                        />
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                        {editingId && (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setDraft({ title: '', time: '', link: '', note: '', priority: '' });
                                }}
                                className="px-3 py-2 text-xs font-mono text-stone-500 hover:text-stone-800 border border-orange-200 hover:border-orange-300"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={async () => {
                                if (!draft.title) return;
                                if (editingId) {
                                    await editEvent({
                                        id: editingId,
                                        title: draft.title,
                                        date: dateStr,
                                        startTime: draft.time,
                                        priority: parsePriority(draft.priority),
                                        link: draft.link,
                                        note: draft.note
                                    } as CalendarEvent);
                                } else {
                                    await addEvent(selectedDate, { ...draft, priority: parsePriority(draft.priority) });
                                }
                                setEditingId(null);
                                setDraft({ title: '', time: '', link: '', note: '', priority: '' });
                            }}
                            className="px-4 py-2 bg-orange-400 text-white text-xs font-mono font-bold hover:bg-orange-500 transition-colors flex items-center gap-2 rounded-lg"
                        >
                            <Plus className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Add Entry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
