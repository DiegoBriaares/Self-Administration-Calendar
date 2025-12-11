import React from 'react';
import { getMonthGrid, isDateInRange, formatDate, formatMonthYear } from '../../utils/dateUtils';
import { useCalendarStore } from '../../store/calendarStore';
import { isSameMonth, isToday } from 'date-fns';
import clsx from 'clsx';

interface MonthGridProps {
    year: number;
    month: number;
    onDateClick: (date: Date) => void;
    onDateDoubleClick?: (date: Date) => void;
    onDateEnter: (date: Date) => void;
    isSelecting: boolean;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
    year,
    month,
    onDateClick,
    onDateDoubleClick,
    onDateEnter,
    isSelecting
}) => {
    const days = getMonthGrid(year, month);
    const { events, selection } = useCalendarStore();
    const currentMonthDate = new Date(year, month);

    return (
        <div className="relative flex flex-col bg-[#0c0f14] border border-white/10 p-1">
            {/* Technical Header */}
            <div className="flex justify-between items-end border-b border-white/10 pb-4 mb-4 px-2">
                <div>
                    <div className="text-[10px] text-slate-500 font-mono tracking-widest mb-1">SECTOR {month + 1}</div>
                    <h3 className="text-2xl text-[#d4af37] uppercase tracking-widest">
                        {formatMonthYear(currentMonthDate)}
                    </h3>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#d4af37] rounded-full opacity-50"></div>
                    <div className="w-2 h-2 border border-[#d4af37] rounded-full opacity-50"></div>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-white/10 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-[10px] text-slate-500 font-mono uppercase py-2 border-r border-white/5 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid Body */}
            <div className="grid grid-cols-7 auto-rows-fr gap-[1px] bg-white/10 border border-white/5">
                {days.map((date) => {
                    const dateStr = formatDate(date);
                    const dayEvents = events[dateStr] || [];
                    const isSelected = isDateInRange(date, selection.start, selection.end);
                    const isCurrentMonth = isSameMonth(date, currentMonthDate);
                    const isDayToday = isToday(date);

                    return (
                        <div
                            key={date.toISOString()}
                            onMouseDown={() => onDateClick(date)}
                            onDoubleClick={() => onDateDoubleClick?.(date)}
                            onMouseEnter={() => isSelecting && onDateEnter(date)}
                            className={clsx(
                                "min-h-[120px] relative p-2 transition-colors duration-200 group bg-[#0c0f14]",
                                !isCurrentMonth && "opacity-25 bg-[#080a0d]",
                                isSelected && "bg-[#d4af37]/10",
                                isDayToday && !isSelected && "bg-white/5"
                            )}
                        >
                            {/* Crosshairs for precision */}
                            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Date Number */}
                            <div className="flex justify-between items-start mb-2">
                                <span className={clsx(
                                    "text-xs font-mono",
                                    isDayToday ? "text-[#d4af37] font-bold" : "text-slate-500",
                                    isSelected && "text-[#d4af37]"
                                )}>
                                    {String(date.getDate()).padStart(2, '0')}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="text-[9px] text-slate-600 font-mono">
                                        [{dayEvents.length}]
                                    </span>
                                )}
                            </div>

                            {/* Events - Technical Blocks */}
                            <div className="flex flex-col gap-1">
                                {dayEvents.map((event, idx) => (
                                    <div
                                        key={event.id}
                                        className={clsx(
                                            "text-[10px] font-mono truncate px-1 py-1 border-l-2 transition-all",
                                            "bg-white/5 hover:bg-white/10",
                                            idx % 3 === 0 && "border-cyan-500/50 text-cyan-200/80",
                                            idx % 3 === 1 && "border-purple-500/50 text-purple-200/80",
                                            idx % 3 === 2 && "border-emerald-500/50 text-emerald-200/80",
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate">{event.title}</span>
                                            {event.startTime ? (
                                                <span className="text-[9px] text-slate-300 bg-white/10 px-1 rounded">{event.startTime}</span>
                                            ) : (
                                                <span className="text-[9px] text-slate-500 bg-white/5 px-1 rounded">--:--</span>
                                            )}
                                        </div>
                                        {event.link && (
                                            <a href={event.link} target="_blank" rel="noreferrer" className="text-[9px] text-sky-300 underline">
                                                link
                                            </a>
                                        )}
                                        {event.note && (
                                            <div className="text-[9px] text-slate-400 truncate">{event.note}</div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Selection Overlay */}
                            {isSelected && (
                                <div className="absolute inset-0 border border-[#d4af37]/30 pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-[#d4af37]/10" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-[1px] bg-[#d4af37]/10" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
