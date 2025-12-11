import React, { useState, useEffect } from 'react';
import { MonthGrid } from './MonthGrid';
import { useCalendarStore } from '../../store/calendarStore';
import { getNextMonth, getPrevMonth } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { EventBoard } from './EventBoard';
import { RangeBoard } from './RangeBoard';
import { DayModal } from './DayModal';

export const CalendarView: React.FC = () => {
    const { viewDate, setViewDate, setSelection, setSelectionActive, selection } = useCalendarStore();
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);
    const [activeDate, setActiveDate] = useState<Date | null>(null);
    const [modalDate, setModalDate] = useState<Date | null>(null);

    useEffect(() => {
        const handleMouseUp = () => {
            if (isSelecting && selectionStart && hoverDate) {
                setSelection(selectionStart, hoverDate);
            }
            setSelectionActive(false);
            setIsSelecting(false);
            setSelectionStart(null);
            setHoverDate(null);
        };
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [isSelecting, selectionStart, hoverDate, setSelection]);

    const handleDateClick = (date: Date) => {
        setIsSelecting(true);
        setSelectionActive(true);
        setSelectionStart(date);
        setHoverDate(date);
        setSelection(date, date);
        setActiveDate(date);
    };

    const handleDateEnter = (date: Date) => {
        if (isSelecting && selectionStart) {
            setHoverDate(date);
            setSelection(selectionStart, date);
        }
    };

    const handleDateDoubleClick = (date: Date) => {
        setActiveDate(date);
        setModalDate(date);
    };

    const handlePrev = () => {
        const { year, month } = getPrevMonth(viewDate.getFullYear(), viewDate.getMonth());
        setViewDate(new Date(year, month));
    };

    const handleNext = () => {
        const { year, month } = getNextMonth(viewDate.getFullYear(), viewDate.getMonth());
        setViewDate(new Date(year, month));
    };

    const monthsToDisplay = [];
    let current = { year: viewDate.getFullYear(), month: viewDate.getMonth() };
    for (let i = 0; i < 2; i++) {
        monthsToDisplay.push({ ...current });
        current = getNextMonth(current.year, current.month);
    }

    return (
        <div className="flex flex-col w-full max-w-[1600px] mx-auto p-8">
            {/* Technical Header Block */}
            <div className="border border-white/10 bg-[#0c0f14] p-6 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-20 h-20 border-r border-b border-white/5"></div>
                <div className="absolute bottom-0 right-0 w-20 h-20 border-l border-t border-white/5"></div>

                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 border border-[#d4af37]/30 rounded-full">
                            <Compass className="w-8 h-8 text-[#d4af37]" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-slate-500 tracking-[0.3em] mb-1">SYSTEM: CHRONOS</div>
                            <h1 className="text-4xl text-white tracking-widest font-serif">
                                TEMPORAL <span className="text-[#d4af37]">MATRIX</span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right mr-8">
                            <div className="text-[10px] font-mono text-slate-500">COORDINATES</div>
                            <div className="text-sm font-mono text-[#d4af37]">
                                {viewDate.getFullYear()}.{String(viewDate.getMonth() + 1).padStart(2, '0')}
                            </div>
                        </div>

                        <div className="flex border border-white/10">
                            <button onClick={handlePrev} className="p-3 hover:bg-white/5 border-r border-white/10 transition-colors">
                                <ChevronLeft className="w-5 h-5 text-slate-400" />
                            </button>
                            <button onClick={handleNext} className="p-3 hover:bg-white/5 transition-colors">
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 select-none">
                {monthsToDisplay.map((m) => (
                    <MonthGrid
                        key={`${m.year}-${m.month}`}
                        year={m.year}
                        month={m.month}
                        onDateClick={handleDateClick}
                        onDateDoubleClick={handleDateDoubleClick}
                        onDateEnter={handleDateEnter}
                        isSelecting={isSelecting}
                    />
                ))}
            </div>

            {!selection.start && (
                <div className="mt-8 border-t border-white/5 pt-4 text-center">
                    <span className="text-[10px] font-mono text-slate-600 tracking-widest">
            // AWAITING INPUT VECTOR // INITIATE DRAG SEQUENCE
                    </span>
                </div>
            )}

            {activeDate && (
                <div className="mt-8">
                    <EventBoard selectedDate={activeDate} />
                </div>
            )}
            <RangeBoard />
            {modalDate && (
                <DayModal date={modalDate} onClose={() => setModalDate(null)} />
            )}
        </div>
    );
};
