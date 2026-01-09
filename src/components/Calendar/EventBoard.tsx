import React, { useState, useMemo, useEffect } from 'react';
import { useCalendarStore, type CalendarEvent } from '../../store/calendarStore';
import { formatDate } from '../../utils/dateUtils';
import { Clock, Link as LinkIcon, StickyNote, Trash2, Edit3, Plus, Lock, Unlock, Copy } from 'lucide-react';

interface EventBoardProps {
    selectedDate: Date | null;
}

export const EventBoard: React.FC<EventBoardProps> = ({ selectedDate }) => {
    const { events, viewMode, addEvent, deleteEvent, editEvent, copyEventsToDate } = useCalendarStore();
    const [draft, setDraft] = useState({ title: '', time: '', link: '', note: '', priority: '', unlockDate: '' });
    const [copyTarget, setCopyTarget] = useState('');
    const [selectedCopyIds, setSelectedCopyIds] = useState<Set<string>>(new Set());
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

    const selectedCopyCount = selectedCopyIds.size;
    const allSelected = dayEvents.length > 0 && selectedCopyCount === dayEvents.length;
    const showCopySelector = viewMode !== 'friend' && !!copyTarget;

    useEffect(() => {
        if (!copyTarget) {
            setSelectedCopyIds(new Set());
        }
    }, [copyTarget]);

    useEffect(() => {
        setSelectedCopyIds(new Set());
    }, [dateStr]);

    const toggleCopySelection = (id: string) => {
        setSelectedCopyIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAllForCopy = () => {
        setSelectedCopyIds((prev) => {
            if (dayEvents.length === 0) return prev;
            if (prev.size === dayEvents.length) return new Set();
            return new Set(dayEvents.map((event) => event.id));
        });
    };

    return (
        <div className="w-full board-panel p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <div className="text-[10px] font-mono text-stone-500 tracking-[0.25em] uppercase">Day Log</div>
                    <div className="text-xl text-stone-800 tracking-[0.15em]">{dateStr}</div>
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
                    <span className="pill-soft text-sm font-medium uppercase">Read-only</span>
                )}
            </div>

            {viewMode !== 'friend' && (
                <div className="mb-5 flex flex-wrap items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-xl p-3">
                    <div className="text-[11px] font-mono text-orange-600 uppercase tracking-[0.2em]">Copy this day to</div>
                    <input
                        type="date"
                        value={copyTarget}
                        onChange={(e) => setCopyTarget(e.target.value)}
                        className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-3 py-2 rounded-lg focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors"
                    />
                    {copyTarget && dayEvents.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                            {selectedCopyCount > 0 && (
                                <span className="text-stone-400">{selectedCopyCount} chosen</span>
                            )}
                            <button
                                type="button"
                                onClick={toggleSelectAllForCopy}
                                className="px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-widest border border-orange-200 text-orange-600 hover:text-orange-700 hover:border-orange-300 bg-white"
                            >
                                {allSelected ? 'None' : 'All'}
                            </button>
                        </div>
                    )}
                    <button
                        onClick={async () => {
                            if (!copyTarget) return;
                            const selection = selectedCopyCount > 0 ? Array.from(selectedCopyIds) : undefined;
                            await copyEventsToDate(dateStr, copyTarget, selection);
                            setCopyTarget('');
                            setSelectedCopyIds(new Set());
                        }}
                        disabled={!copyTarget}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${copyTarget
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-200'
                            : 'bg-stone-200 text-stone-500 cursor-not-allowed'
                            }`}
                    >
                        <Copy className="w-4 h-4" /> {selectedCopyCount > 0 ? 'Copy Selected' : 'Copy Events'}
                    </button>
                </div>
            )}

            {dayEvents.length === 0 ? (
                <div className="text-sm text-stone-500">No entries. Add one below.</div>
            ) : (
                <div className="flex flex-col gap-3">
                    {dayEvents.map((event: CalendarEvent) => {
                        const isLocked = event.unlockDate && new Date(event.unlockDate) > new Date();
                        const content = isLocked ? (
                            <div className="p-2 flex flex-col items-center justify-center text-stone-400 gap-2 min-h-[60px]">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-xs font-mono uppercase tracking-widest">Time Capsule</span>
                                </div>
                                <div className="text-[10px]">Unlocks {formatDate(new Date(event.unlockDate!))}</div>
                                {viewMode !== 'friend' && (
                                    <button
                                        onClick={() => {
                                            setEditingId(event.id);
                                            setDraft({
                                                title: event.title || '',
                                                time: event.startTime || '',
                                                priority: event.priority !== null && event.priority !== undefined ? String(event.priority) : '',
                                                link: event.link || '',
                                                note: event.note || '',
                                                unlockDate: event.unlockDate || ''
                                            });
                                        }}
                                        className="text-xs text-orange-500 hover:text-orange-600 underline"
                                    >
                                        Reveal & Edit
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="text-sm text-stone-800 dark:text-slate-100 font-medium flex items-center gap-2">
                                        {event.title}
                                        {event.unlockDate && <Unlock className="w-3 h-3 text-stone-400" />}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-stone-500">
                                        <span className="pill-soft flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-orange-500" /> {getMetaLabel(event)}
                                        </span>
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
                                                            note: event.note || '',
                                                            unlockDate: event.unlockDate || ''
                                                        });
                                                    }}
                                                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                                                >
                                                    <Edit3 className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => deleteEvent(event.id)}
                                                    className="text-red-500 hover:text-red-600 flex items-center gap-1 font-medium"
                                                >
                                                    <Trash2 className="w-3 h-3" /> Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {event.note && (
                                    <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-300">
                                        <StickyNote className="w-3 h-3 text-amber-500" /> {event.note}
                                    </div>
                                )}
                                {event.link && (
                                    <a href={event.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 underline">
                                        <LinkIcon className="w-3 h-3" /> {event.link}
                                    </a>
                                )}
                                {event.resources && (
                                    <div className="mt-2 pl-2 border-l-2 border-orange-100 flex flex-col gap-1">
                                        {JSON.parse(event.resources).map((res: any, idx: number) => (
                                            <div key={idx} className="text-xs text-stone-500 flex items-center gap-1">
                                                {res.type === 'link' ? <LinkIcon className="w-3 h-3" /> : <StickyNote className="w-3 h-3" />}
                                                {res.type === 'link' ? (
                                                    <a href={res.content} target="_blank" rel="noreferrer" className="hover:underline">{res.title || res.content}</a>
                                                ) : (
                                                    <span>{res.content}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        );

                        return (
                            <div key={event.id} className="board-card flex flex-col gap-2 relative overflow-hidden">
                                {showCopySelector ? (
                                    <div className="flex items-start gap-3">
                                        <label className="mt-1 flex items-center gap-2 text-xs text-stone-500 bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-orange-100 shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedCopyIds.has(event.id)}
                                                onChange={() => toggleCopySelection(event.id)}
                                                className="h-4 w-4 accent-orange-500"
                                            />
                                            <span className="sr-only">Select event for copy</span>
                                        </label>
                                        <div className="flex-1 min-w-0">
                                            {content}
                                        </div>
                                    </div>
                                ) : (
                                    content
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {viewMode !== 'friend' && (
                <div className="mt-4 border-t border-orange-200 dark:border-slate-700 pt-4">
                    <div className="text-xs font-mono text-orange-600 uppercase tracking-[0.25em] mb-3 font-medium">Create / Update</div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <input
                            type="text"
                            value={draft.title}
                            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                            placeholder="Title"
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors placeholder:text-stone-400"
                        />
                        <input
                            type="time"
                            value={draft.time}
                            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors"
                        />
                        <input
                            type="number"
                            step="1"
                            value={draft.priority}
                            onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                            placeholder="Priority"
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors placeholder:text-stone-400"
                        />
                        <input
                            type="url"
                            value={draft.link}
                            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                            placeholder="Link"
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors placeholder:text-stone-400"
                        />
                        <input
                            type="text"
                            value={draft.note}
                            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                            placeholder="Note"
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-4 py-2.5 rounded-xl focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors placeholder:text-stone-400"
                        />
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-stone-500">
                        <span className="text-xs font-mono uppercase tracking-widest">Time Capsule:</span>
                        <input
                            type="date"
                            value={draft.unlockDate ? new Date(draft.unlockDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => setDraft({ ...draft, unlockDate: e.target.value })}
                            className="bg-white border-2 border-orange-200 text-sm text-stone-800 px-2 py-1.5 rounded-lg focus:outline-none focus:border-orange-400 hover:border-orange-300 transition-colors"
                        />
                    </div>
                    <div className="flex gap-3 justify-end mt-4">
                        {editingId && (
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setDraft({ title: '', time: '', link: '', note: '', priority: '', unlockDate: '' });
                                }}
                                className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700 border border-stone-300 hover:border-stone-400 transition-all rounded-xl"
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
                                        note: draft.note,
                                        unlockDate: draft.unlockDate || null
                                    } as CalendarEvent);
                                } else {
                                    await addEvent(selectedDate, { ...draft, priority: parsePriority(draft.priority) });
                                }
                                setEditingId(null);
                                setDraft({ title: '', time: '', link: '', note: '', priority: '', unlockDate: '' });
                            }}
                            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2 rounded-xl shadow-lg shadow-orange-300/50"
                        >
                            <Plus className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Add Entry'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
