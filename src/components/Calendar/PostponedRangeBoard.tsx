import React, { useMemo, useState } from 'react';
import { useCalendarStore } from '../../store/calendarStore';
import { CalendarRange } from 'lucide-react';

export const PostponedRangeBoard: React.FC = () => {
    const { postponedEvents, viewMode, addEventsBulk, deletePostponedEvent } = useCalendarStore();
    const [sortOrder, setSortOrder] = React.useState<'time' | 'priority'>('time');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [targetDate, setTargetDate] = useState('');
    const [transferMode, setTransferMode] = useState<'copy' | 'move'>('copy');

    const isReadOnly = viewMode === 'friend';
    const sourceEvents = useMemo(() => {
        const list = postponedEvents || [];
        return [...list].sort((a, b) => {
            const priorityValue = (value?: number | null) => {
                if (value === null || value === undefined) return Number.MAX_SAFE_INTEGER;
                return value;
            };
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
    }, [postponedEvents, sortOrder]);

    const allSelected = sourceEvents.length > 0 && selectedIds.length === sourceEvents.length;
    const canTransfer = !isReadOnly && selectedIds.length > 0 && !!targetDate;

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => (
            prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
        ));
    };

    const handleSelectAll = () => {
        if (sourceEvents.length === 0) return;
        setSelectedIds(allSelected ? [] : sourceEvents.map((event) => event.id));
    };

    const handleTransferEvents = async () => {
        if (!canTransfer) return;
        const selectedEvents = sourceEvents.filter((event) => selectedIds.includes(event.id));
        if (selectedEvents.length === 0) return;
        const payload = selectedEvents.map((event) => {
            const chain: string[] = [];
            (event.originDates || []).forEach((origin) => {
                if (origin && !chain.includes(origin)) {
                    chain.push(origin);
                }
            });
            if (targetDate && !chain.includes(targetDate)) {
                chain.push(targetDate);
            }
            return {
                title: event.title,
                date: targetDate,
                startTime: event.startTime ?? null,
                priority: event.priority ?? null,
                link: event.link ?? null,
                note: event.note ?? null,
                originDates: chain.length > 0 ? chain : null,
                wasPostponed: true
            };
        });
        await addEventsBulk(payload);
        if (transferMode === 'move') {
            for (const event of selectedEvents) {
                await deletePostponedEvent(event.id);
            }
        }
        setSelectedIds([]);
    };

    return (
        <div className="w-full board-panel p-5 mt-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-orange-500" />
                    <div className="text-sm font-medium text-stone-800 tracking-[0.15em] uppercase">Events Management</div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                        <label htmlFor="postponed-order" className="tracking-[0.2em]">Order</label>
                        <select
                            id="postponed-order"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as 'time' | 'priority')}
                            className="border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-stone-600 bg-white"
                        >
                            <option value="time">Hour</option>
                            <option value="priority">Priority</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 uppercase">
                        <label htmlFor="postponed-transfer" className="tracking-[0.2em]">Action</label>
                        <select
                            id="postponed-transfer"
                            value={transferMode}
                            onChange={(e) => setTransferMode(e.target.value as 'copy' | 'move')}
                            className="border border-orange-200 rounded-lg px-2 py-1 text-[11px] text-stone-600 bg-white"
                        >
                            <option value="copy">Copy</option>
                            <option value="move">Move</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="mb-5 border border-orange-200 bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.3em]">Events Management</div>
                </div>
                <div className="mt-3 flex flex-col gap-2">
                    {sourceEvents.length === 0 ? (
                        <div className="text-xs text-stone-400 font-mono">
                            No postponed events to manage.
                        </div>
                    ) : (
                        sourceEvents.map((event) => (
                            <label
                                key={event.id}
                                className="flex items-center gap-3 border border-orange-100 rounded-lg px-3 py-2 hover:border-orange-300 bg-white transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(event.id)}
                                    onChange={() => toggleSelection(event.id)}
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
                <div className="mt-4 border-t border-orange-100 pt-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="text-[10px] font-mono text-stone-500 uppercase tracking-[0.3em]">Target</div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            disabled={isReadOnly}
                            className="border border-orange-200 rounded-lg px-3 py-2 text-sm text-stone-600 bg-white disabled:opacity-60"
                        />
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        disabled={isReadOnly || sourceEvents.length === 0}
                        className="px-3 py-1.5 text-[11px] font-mono border border-orange-200 rounded-lg text-stone-500 hover:text-stone-700 hover:border-orange-400 disabled:opacity-50"
                    >
                        {allSelected ? 'None' : 'All'}
                    </button>
                    <div className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                        Selected {selectedIds.length}
                    </div>
                    <button
                        type="button"
                        onClick={handleTransferEvents}
                        disabled={!canTransfer}
                        className="px-4 py-2 bg-orange-400 text-white text-xs font-mono font-bold hover:bg-orange-500 transition-colors rounded-lg disabled:opacity-50"
                    >
                        {transferMode === 'move' ? 'Move Selected' : 'Copy Selected'}
                    </button>
                </div>
            </div>
        </div>
    );
};
