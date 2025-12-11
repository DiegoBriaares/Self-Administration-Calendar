import React, { useState, useMemo } from 'react';
import { useCalendarStore, type CalendarEvent } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { Clock, Link as LinkIcon, StickyNote, Trash2, Edit3, Plus } from 'lucide-react';

interface EventBoardProps {
    selectedDate: Date | null;
}

export const EventBoard: React.FC<EventBoardProps> = ({ selectedDate }) => {
    const { events, viewMode, addEvent, deleteEvent, editEvent } = useCalendarStore();
    const [draft, setDraft] = useState({ title: '', time: '', link: '', note: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    if (!selectedDate) return null;

    const dateStr = formatDate(selectedDate);
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
        <div className="w-full border border-white/10 bg-[#0c0f14] p-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="text-[10px] font-mono text-slate-500 tracking-[0.25em] uppercase">Day Log</div>
                    <div className="text-xl text-white tracking-[0.2em]">{dateStr}</div>
                </div>
                {viewMode === 'friend' && (
                    <span className="text-[10px] font-mono text-[#d4af37] uppercase">Read-only</span>
                )}
            </div>

            {dayEvents.length === 0 ? (
                <div className="text-xs text-slate-500 font-mono">No entries. Add one below.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dayEvents.map((event: CalendarEvent) => (
                        <div key={event.id} className="border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-white font-mono">{event.title}</div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    {event.startTime && (
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {event.startTime}</span>
                                    )}
                                    {viewMode !== 'friend' && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingId(event.id);
                                                    setDraft({
                                                        title: event.title || '',
                                                        time: event.startTime || '',
                                                        link: event.link || '',
                                                        note: event.note || ''
                                                    });
                                                }}
                                                className="text-emerald-300 hover:text-emerald-100 flex items-center gap-1 text-[11px]"
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => deleteEvent(event.id)}
                                                className="text-red-300 hover:text-red-100 flex items-center gap-1 text-[11px]"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {event.note && (
                                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                                    <StickyNote className="w-3 h-3" /> {event.note}
                                </div>
                            )}
                            {event.link && (
                                <a href={event.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-sky-300 underline">
                                    <LinkIcon className="w-3 h-3" /> {event.link}
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {viewMode !== 'friend' && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.25em] mb-2">Create / Update</div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <input
                            type="text"
                            value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                            placeholder="Title"
                            className="bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                        />
                        <input
                            type="time"
                            value={draft.time}
                            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                            className="bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                        />
                        <input
                            type="url"
                            value={draft.link}
                            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                            placeholder="Link"
                            className="bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                        />
                        <input
                            type="text"
                            value={draft.note}
                            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                            placeholder="Note"
                            className="bg-white/5 border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:border-[#d4af37]"
                        />
                    </div>
                    <div className="flex gap-2 justify-end mt-3">
                        {editingId && (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setDraft({ title: '', time: '', link: '', note: '' });
                                }}
                                className="px-3 py-2 text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:border-white/30"
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
                                        link: draft.link,
                                        note: draft.note
                                    } as CalendarEvent);
                                } else {
                                    await addEvent(selectedDate, draft);
                                }
                                setEditingId(null);
                                setDraft({ title: '', time: '', link: '', note: '' });
                            }}
                            className="px-4 py-2 bg-[#d4af37] text-black text-xs font-mono font-bold hover:bg-[#b5952f] transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Add Entry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
